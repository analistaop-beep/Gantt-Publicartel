import os
import re

files_to_update = [
    "src/pages/HerreriaPage.tsx",
    "src/pages/CorporeasPage.tsx",
    "src/pages/LonasVinilosPage.tsx",
    "src/pages/PinturaPage.tsx"
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Header gap and padding
    content = re.sub(
        r'className="flex flex-col xl:flex-row justify-between items-center gap-6 p-6"',
        r'className="flex flex-col xl:flex-row justify-between items-center gap-4 lg:gap-6 p-4 lg:p-6"',
        content
    )

    # 2. Toolbar scroll wrap
    content = re.sub(
        r'(className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-2 md:pb-0 no-scrollbar.*?)"',
        r'\1 w-full md:w-auto"',
        content
    )

    # 3. Gantt main container
    content = content.replace(
        'className="flex-1 min-h-0 bg-[#0f172a] flex flex-col overflow-hidden border border-white/5 mx-10 mb-2 rounded-[1rem] relative shadow-2xl"',
        'className="flex-1 min-h-0 bg-[#0f172a] flex flex-col overflow-hidden border-t sm:border border-white/5 mx-0 sm:mx-2 lg:mx-10 mb-0 sm:mb-2 rounded-none sm:rounded-[1rem] relative shadow-2xl"'
    )

    # 4. Timeline Header wrapper min-w-max
    content = content.replace(
        'className="sticky top-0 z-40 bg-[#1e293b] border-b border-white/10 w-full"',
        'className="sticky top-0 z-40 bg-[#1e293b] border-b border-white/10 w-full min-w-max"'
    )

    # 5. Grid min-width
    content = content.replace(
        'className="grid grid-cols-6 transition-all duration-700 ease-in-out"',
        'className="grid grid-cols-6 transition-all duration-700 ease-in-out min-w-[900px] lg:min-w-0"'
    )
    content = content.replace(
        'className="grid grid-cols-6 flex-1 transition-all duration-700 ease-in-out"',
        'className="grid grid-cols-6 flex-1 transition-all duration-700 ease-in-out min-w-[900px] lg:min-w-0"'
    )

    # 6. Modal container width and padding
    # Different pages have different modal classes, e.g.,
    # className="bg-[#1e293b] p-8 rounded-sm w-full max-w-[80vw] max-h-[90vh] flex flex-col shadow-2xl border border-white/10"
    # className="glass p-6 rounded-[1.25rem] w-full max-w-[80vw] max-h-[95vh] flex flex-col shadow-2xl border-white/20 animate-in fade-in zoom-in-95 duration-300"
    content = re.sub(
        r'(className="[^"]*?)\bp-8\b([^"]*?)\bw-full max-w-\[80vw\]\b([^"]*?)',
        r'\1p-4 md:p-8\2w-full max-w-[95vw] md:max-w-[80vw]\3',
        content
    )
    content = re.sub(
        r'(className="[^"]*?)\bp-6\b([^"]*?)\bw-full max-w-\[80vw\]\b([^"]*?)',
        r'\1p-4 md:p-6\2w-full max-w-[95vw] md:max-w-[80vw]\3',
        content
    )


    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Processed {filepath}")

for filepath in files_to_update:
    if os.path.exists(filepath):
        process_file(filepath)
    else:
        print(f"File not found: {filepath}")
