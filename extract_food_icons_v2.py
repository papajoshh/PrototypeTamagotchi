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

# Analizar la imagen para detectar el offset y tamaño real de las celdas
# La imagen es 1024x1536px y tiene 4x7 iconos
pixels = img.load()
width, height = img.size

# Detectar primer píxel no transparente desde arriba
offset_top = 0
for y in range(height):
    for x in range(width):
        pixel = pixels[x, y]
        # Si tiene alpha channel y no es completamente transparente
        if len(pixel) == 4 and pixel[3] > 0:
            offset_top = y
            print(f"Primer pixel no transparente en Y: {offset_top}")
            break
    if offset_top > 0:
        break

# Detectar primer píxel no transparente desde la izquierda
offset_left = 0
for x in range(width):
    for y in range(height):
        pixel = pixels[x, y]
        if len(pixel) == 4 and pixel[3] > 0:
            offset_left = x
            print(f"Primer pixel no transparente en X: {offset_left}")
            break
    if offset_left > 0:
        break

# Detectar último píxel no transparente desde abajo
offset_bottom = height
for y in range(height - 1, -1, -1):
    for x in range(width):
        pixel = pixels[x, y]
        if len(pixel) == 4 and pixel[3] > 0:
            offset_bottom = y + 1
            print(f"Ultimo pixel no transparente en Y: {offset_bottom}")
            break
    if offset_bottom < height:
        break

# Detectar último píxel no transparente desde la derecha
offset_right = width
for x in range(width - 1, -1, -1):
    for y in range(height):
        pixel = pixels[x, y]
        if len(pixel) == 4 and pixel[3] > 0:
            offset_right = x + 1
            print(f"Ultimo pixel no transparente en X: {offset_right}")
            break
    if offset_right < width:
        break

# Calcular área útil
useful_width = offset_right - offset_left
useful_height = offset_bottom - offset_top

print(f"\nArea util: {useful_width}x{useful_height}px")
print(f"Offset: top={offset_top}, left={offset_left}, bottom={height - offset_bottom}, right={width - offset_right}")

# Grid configuration
cols = 4
rows = 7
total_icons = cols * rows

# Calcular tamaño de cada celda
cell_width = useful_width / cols
cell_height = useful_height / rows

print(f"Tamano de celda: {cell_width:.2f}x{cell_height:.2f}px")
print(f"\nExtrayendo {total_icons} iconos...")

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
        # Calcular coordenadas con offset
        left = int(offset_left + col * cell_width)
        top = int(offset_top + row * cell_height)
        right = int(offset_left + (col + 1) * cell_width)
        bottom = int(offset_top + (row + 1) * cell_height)

        # Recortar
        icon = img.crop((left, top, right, bottom))

        # Guardar
        index = row * cols + col
        filename = f"{icon_names[index]}.png"
        output_path = os.path.join(output_dir, filename)
        icon.save(output_path)
        print(f"  [{index+1}/{total_icons}] Guardado: {filename} (coords: {left},{top} -> {right},{bottom})")

print(f"\nExtraccion completada! {total_icons} iconos guardados en: {output_dir}")
