from mcp.server.fastmcp import FastMCP
from git import Repo
import os

mcp = FastMCP("GitAutomator")

@mcp.tool()
def push_code_to_git(commit_message: str):
    """Saves and pushes the generated code to your git repository."""
    repo = Repo(".") # Assumes the server is running in your project root
    
    # 1. Stage the files
    repo.git.add(A=True)
    
    # 2. Commit
    repo.index.commit(commit_message)
    
    # 3. Push
    origin = repo.remote(name='origin')
    origin.push()
    
    return f"Successfully pushed: {commit_message}"
