from PIL import Image, ImageDraw

def create_icon(size, output_path):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    bg_color = (12, 12, 15)
    primary = (94, 234, 212)
    
    margin = size // 10
    draw.rounded_rectangle([margin, margin, size-margin, size-margin], 
                          radius=size//5, fill=bg_color)
    
    lock_width = size // 3
    lock_height = size // 2.5
    lock_x = (size - lock_width) // 2
    lock_y = size // 3
    
    draw.rounded_rectangle([lock_x, lock_y, lock_x + lock_width, lock_y + lock_height],
                          radius=size//20, fill=primary)
    
    arc_size = lock_width - size//10
    arc_x = lock_x + (lock_width - arc_size) // 2
    arc_y = lock_y - arc_size // 2
    draw.arc([arc_x, arc_y, arc_x + arc_size, arc_y + arc_size],
             start=0, end=180, fill=primary, width=size//25)
    
    keyhole_size = size // 15
    keyhole_x = size // 2 - keyhole_size // 2
    keyhole_y = lock_y + lock_height // 2 - keyhole_size // 2
    draw.ellipse([keyhole_x, keyhole_y, keyhole_x + keyhole_size, keyhole_y + keyhole_size],
                fill=bg_color)
    
    img.save(output_path, 'PNG')
    print(f'Created {output_path}')

sizes = [72, 96, 128, 144, 152, 192, 384, 512]
for s in sizes:
    create_icon(s, f'icons/icon-{s}.png')

print('All icons created!')
