#!/usr/bin/env python3
import zipfile
import os

# Set the project path
project_path = r"c:\Users\Python120612\Desktop\TRAE"
zip_path = os.path.join(project_path, "project.zip")

# Create a zip file
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # Walk through the directory
    for root, dirs, files in os.walk(project_path):
        for file in files:
            # Skip the zip file itself
            if file == "project.zip" or file == "zip-project.py" or file == "zip-project.ps1":
                continue
            # Create the full file path
            file_path = os.path.join(root, file)
            # Create the archive name (relative path)
            arcname = os.path.relpath(file_path, project_path)
            # Add file to zip
            zipf.write(file_path, arcname)

print(f"Project zipped successfully to {zip_path}")