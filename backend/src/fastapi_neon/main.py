from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy import or_, and_
from sqlmodel import Field, Session, SQLModel, create_engine, select, delete
from pydantic import BaseModel

from fastapi_neon import settings

from fastapi.middleware.cors import CORSMiddleware


class TreeNode(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tree_id: int
    path: str
    name: str
    data: Optional[str] = Field(default=None)


class CreateChildRequest(BaseModel):
    parent_id: int
    name: str
    data: Optional[str] = None


class UpdateNodeRequest(BaseModel):
    name: Optional[str] = None
    data: Optional[str] = None


connection_string = str(settings.DATABASE_URL).replace(
    "postgresql", "postgresql+psycopg"
)

engine = create_engine(
    connection_string,
    connect_args={"sslmode": "require"},
    pool_recycle=300,
)

def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)


def get_session():
    with Session(engine) as session:
        yield session


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"hello": "world"}


@app.post("/trees/{tree_id}/root", response_model=TreeNode)
def create_root(tree_id: int, name: str, data: Optional[str] = None, session: Session = Depends(get_session)):
    node = TreeNode(tree_id=tree_id, path="", name=name, data=data)
    session.add(node)
    session.commit()
    session.refresh(node)
    
    node.path = str(node.id)
    session.add(node)
    session.commit()
    session.refresh(node)
    return node


@app.post("/trees/{tree_id}/nodes", response_model=TreeNode)
def create_child(tree_id: int, request: CreateChildRequest, session: Session = Depends(get_session)):
    parent = session.get(TreeNode, request.parent_id)
    if not parent:
        raise HTTPException(status_code=404, detail="parent not found")

    prefix = parent.path + "."
    descendants = session.exec(
        select(TreeNode)
        .where(TreeNode.tree_id == tree_id)
        .where(TreeNode.path.like(prefix + "%"))
    ).all()

    parent_depth = parent.path.count(".")
    direct_children = [n for n in descendants if n.path.count(".") == parent_depth + 1]
    next_child_num = len(direct_children) + 1
    new_path = f"{parent.path}.{next_child_num}"

    new_node = TreeNode(tree_id=tree_id, path=new_path, name=request.name, data=request.data)
    session.add(new_node)

    parent.data = None
    session.add(parent)

    session.commit()
    session.refresh(new_node)
    return new_node


@app.get("/trees")
def get_all_trees(session: Session = Depends(get_session)):
    nodes = session.exec(select(TreeNode)).all()
    if not nodes:
        return []

    grouped = {}
    for n in nodes:
        grouped.setdefault(n.tree_id, []).append(n)

    result = []

    for tree_id, tree_nodes in grouped.items():
        path_map = {
            n.path: {
                "id": n.id,
                "tree_id": n.tree_id,
                "path": n.path,
                "name": n.name,
                "data": n.data,
                "children": []
            }
            for n in tree_nodes
        }

        root = None

        for path, node in path_map.items():
            if "." not in path:
                root = node
                continue

            parent_path = path.rsplit(".", 1)[0]
            if parent_path in path_map:
                path_map[parent_path]["children"].append(node)

        def sort_children(node):
            node["children"].sort(
                key=lambda c: [int(x) for x in c["path"].split(".")]
            )
            for child in node["children"]:
                sort_children(child)

        if root:
            sort_children(root)

        result.append({
            "tree_id": tree_id,
            "root": root
        })

    return result


@app.get("/trees/{tree_id}", response_model=List[TreeNode])
def get_tree(tree_id: int, session: Session = Depends(get_session)):
    nodes = session.exec(
        select(TreeNode).where(TreeNode.tree_id == tree_id).order_by(TreeNode.path)
    ).all()
    return nodes


@app.get("/trees/{tree_id}/nested")
def get_tree_nested(tree_id: int, session: Session = Depends(get_session)):
    nodes = session.exec(
        select(TreeNode)
        .where(TreeNode.tree_id == tree_id)
        .order_by(TreeNode.path)
    ).all()

    if not nodes:
        return {}

    path_map = {}
    for n in nodes:
        path_map[n.path] = {
            "id": n.id,
            "tree_id": n.tree_id,
            "path": n.path,
            "name": n.name,
            "data": n.data,
            "children": []
        }

    root = None

    for path, node in path_map.items():
        if "." not in path: 
            root = node
            continue

        parent_path = path.rsplit(".", 1)[0]
        if parent_path in path_map:
            path_map[parent_path]["children"].append(node)

    return root


@app.patch("/nodes/{node_id}", response_model=TreeNode)
def update_node(node_id: int, request: UpdateNodeRequest, session: Session = Depends(get_session)):
    node = session.get(TreeNode, node_id)
    if not node:
        raise HTTPException(status_code=404, detail="node not found")

    if request.name is not None:
        node.name = request.name
   
    if request.data is not None:
        node.data = request.data

    has_children = session.exec(
        select(TreeNode)
        .where(TreeNode.tree_id == node.tree_id)
        .where(TreeNode.path.like(node.path + ".%"))
    ).first()
    if has_children:
        node.data = None

    session.add(node)
    session.commit()
    session.refresh(node)
    return node


@app.delete("/nodes/{tree_id}/{path}")
def delete_subtree(tree_id: int, path: str, session: Session = Depends(get_session)):
    stmt = delete(TreeNode).where(
        and_(
            TreeNode.tree_id == tree_id,
            or_(TreeNode.path == path, TreeNode.path.like(path + ".%"))
        )
    )
    result = session.exec(stmt)
    session.commit()

    return {"deleted_rows": result.rowcount if hasattr(result, "rowcount") else None}