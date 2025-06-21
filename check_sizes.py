import os

def get_folder_size_bytes(folder_path):
    """Recursively calculates the total size of all files in a folder."""
    total_size = 0
    try:
        for item in os.listdir(folder_path):
            item_path = os.path.join(folder_path, item)
            if os.path.isfile(item_path) and not os.path.islink(item_path):
                try:
                    total_size += os.path.getsize(item_path)
                except OSError:
                    # Skip files that might have issues (e.g., broken symlinks, permissions)
                    # print(f"Warning: Could not get size for file: {item_path}")
                    continue
            elif os.path.isdir(item_path) and not os.path.islink(item_path):
                total_size += get_folder_size_bytes(item_path) # Recursive call
    except OSError as e:
        # Ignores folders that cannot be accessed
        # print(f"Warning: Could not access folder: {folder_path} due to: {e}")
        pass
    return total_size

def main():
    project_root = '.' # Current directory
    print(f"Calculating sizes for items in: {os.path.abspath(project_root)}")
    print("--------------------------------------------------")

    items_in_root = []
    try:
        items_in_root = os.listdir(project_root)
    except OSError as e:
        print(f"Error: Could not list items in project root: {e}")
        return

    for item_name in items_in_root:
        item_path = os.path.join(project_root, item_name)
        size_bytes = 0
        display_type = ""

        if os.path.isfile(item_path) and not os.path.islink(item_path):
            try:
                size_bytes = os.path.getsize(item_path)
                display_type = "File"
            except OSError as e:
                # Skip files that might have issues
                # print(f"Warning: Could not get size for file {item_path}: {e}")
                continue
        elif os.path.isdir(item_path) and not os.path.islink(item_path):
            # For directories, calculate total size recursively.
            # This can be slow for very large directories like node_modules.
            print(f"Calculating size for directory: {item_name} ... (this may take a while)")
            size_bytes = get_folder_size_bytes(item_path)
            display_type = "Directory"
        else:
            # Could be a symlink or other special file, skip for simplicity
            # print(f"Skipping: {item_name} (not a regular file or directory)")
            continue

        size_mb = size_bytes / (1024 * 1024)
        if size_mb > 0.01: # Only print if size is somewhat significant (above 0.01MB)
             print(f"{display_type}: {item_name} - {size_mb:.2f} MB")

    print("--------------------------------------------------")
    print("Note: Sizes are approximate. Calculation for very large directories (like 'node_modules') can take a long time.")

if __name__ == "__main__":
    main()