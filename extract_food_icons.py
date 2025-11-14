from PIL import Image
import os

# Ruta de la imagen fuente
input_path = r"D:\Repositorios\Michi Games\TamagotchiPrototype\public\assets\ingredients\Food.png"
output_dir = r"D:\Repositorios\Michi Games\TamagotchiPrototype\public\assets\ingredients\extracted"

# Crear directorio de salida si no existe
os.makedirs(output_dir, exist_ok=True)

# Abrir la imagen
img = Image.open(input_path)
print(f"Imagen cargada: {img.size[0]}x{img.size[1]}px")

# Grid configuration
cols = 4
rows = 7
total_icons = cols * rows

# Calcular tamaño de cada celda
cell_width = img.size[0] // cols
cell_height = img.size[1] // rows

print(f"Tamaño de celda: {cell_width}x{cell_height}px")
print(f"Extrayendo {total_icons} iconos...")

# Nombres de los iconos (en orden de izquierda a derecha, arriba a abajo)
icon_names = [
    "pizza", "basketball", "croissant", "hotdog",
    "icecream", "coffee", "cupcake", "pretzel",
    "banana", "apple", "grapes", "watermelon",
    "cookie", "popcorn", "fries", "strawberry",
    "onigiri", "popsicle", "pancakes", "muffin",
    "donut", "icecream_bar", "chicken", "lollipop",
    "donut2", "cinnamon_roll", "cupcake2", "chocolate"
]

# Extraer cada celda
for row in range(rows):
    for col in range(cols):
        # Calcular coordenadas
        left = col * cell_width
        top = row * cell_height
        right = left + cell_width
        bottom = top + cell_height

        # Recortar
        icon = img.crop((left, top, right, bottom))

        # Guardar
        index = row * cols + col
        filename = f"{icon_names[index]}.png"
        output_path = os.path.join(output_dir, filename)
        icon.save(output_path)
        print(f"  [{index+1}/{total_icons}] Guardado: {filename}")

print(f"\n✅ Extracción completada! {total_icons} iconos guardados en: {output_dir}")
