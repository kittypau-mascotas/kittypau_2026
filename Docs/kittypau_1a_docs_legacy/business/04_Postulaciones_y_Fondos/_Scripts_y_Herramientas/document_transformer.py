import os
import shutil

def transform_documents(root_dir):
    incompatible_dir = os.path.join(root_dir, "Formato_no_Compatible")
    os.makedirs(incompatible_dir, exist_ok=True)

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude the incompatible_dir itself from being processed
        if incompatible_dir in dirpath:
            continue

        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            file_name_without_ext, file_extension = os.path.splitext(filename)
            file_extension = file_extension.lower()

            if file_extension == ".csv":
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Simple CSV to Markdown table conversion
                    lines = content.strip().split('\n')
                    if not lines:
                        continue
                    
                    header = lines[0].split(',')
                    md_content = "| " + " | ".join(header) + " |\n"
                    md_content += "| " + " | ".join(["---"] * len(header)) + " |\n"
                    
                    for line in lines[1:]:
                        row = line.split(',')
                        md_content += "| " + " | ".join(row) + " |\n"
                    
                    new_md_path = os.path.join(dirpath, file_name_without_ext + ".md")
                    with open(new_md_path, 'w', encoding='utf-8') as f:
                        f.write(md_content)
                    print(f"Converted CSV: {file_path} to {new_md_path}")
                    # Optionally remove original CSV if conversion is successful
                    # os.remove(file_path)

                except Exception as e:
                    print(f"Error converting CSV {file_path}: {e}")
                    shutil.move(file_path, os.path.join(incompatible_dir, filename))
                    print(f"Moved incompatible file to: {os.path.join(incompatible_dir, filename)}")

            elif file_extension in [".pdf", ".docx", ".xlsx", ".pptx"]:
                shutil.move(file_path, os.path.join(incompatible_dir, filename))
                print(f"Moved incompatible file to: {os.path.join(incompatible_dir, filename)}")
            # Add other text-based formats if needed, e.g., .txt, .log, .json
            # else:
            #     # For other readable text files, no conversion needed, already readable
            #     pass

if __name__ == "__main__":
    root_directory_to_scan = "D:\\Escritorio\\Proyectos\\KittyPaw\\Kittypaw_1a\\docs\\business\\04_Postulaciones_y_Fondos"
    transform_documents(root_directory_to_scan)
