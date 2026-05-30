import json, urllib.request
TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMTlmOGJjZTllMTljM2NmZDMwMTZlZiIsImlhdCI6MTc4MDA4NzAwNCwiZXhwIjoxNzgwNjkxODA0fQ.MXGst-vQ5bvGx-oqP4tzyBwyKclQnReSEGmShm1KuXA'
all_ids=[]
for page in range(1, 6):
    req = urllib.request.Request('http://localhost:3000/api/feed?page=' + str(page) + '&limit=24', headers={'Authorization': 'Bearer ' + TOKEN})
    with urllib.request.urlopen(req) as r:
        data = json.load(r)
    all_ids.extend(item['_id'] for item in data.get('items', []))
print('TOTAL_IDS', len(all_ids))
print('UNIQUE_IDS', len(set(all_ids)))
print('DUPLICATES_ACROSS_PAGES', len(all_ids)-len(set(all_ids)))
