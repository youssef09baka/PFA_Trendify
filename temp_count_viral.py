import csv
from collections import Counter
with open('ml-model/data/Redit_data.csv', newline='', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    counts = Counter(row['viral'] for row in reader if row.get('viral') is not None)
print(counts)
