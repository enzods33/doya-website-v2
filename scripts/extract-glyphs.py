"""Separate the four existing vector paths; no redraw, tracing or recoloring."""
from pathlib import Path
import copy
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
ET.register_namespace('', 'http://www.w3.org/2000/svg')
source = ET.parse(root / 'src/assets/logos/doya-wordmark-white.svg').getroot()
paths = list(source)
glyphs = {
    'd': (0, '148.1 112.9 8.4 10.7'),
    'o': (3, '161.8 112.9 10.9 10.7'),
    'y': (1, '176.8 112.9 8.2 10.7'),
    'a': (2, '188.8 112.9 7.1 10.7'),
}
destination = root / 'src/assets/logos/glyphs'
destination.mkdir(exist_ok=True)
for letter, (index, viewbox) in glyphs.items():
    svg = ET.Element('{http://www.w3.org/2000/svg}svg', {'viewBox': viewbox})
    svg.append(copy.deepcopy(paths[index]))
    ET.ElementTree(svg).write(destination / f'doya-{letter}-white.svg', encoding='utf-8', xml_declaration=True)
