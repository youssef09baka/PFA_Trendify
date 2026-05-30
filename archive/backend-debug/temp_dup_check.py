import json, urllib.request

TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhMTlmOGJjZTllMTljM2NmZDMwMTZlZiIsImlhdCI6MTc4MDA4NzAwNCwiZXhwIjoxNzgwNjkxODA0fQ.MXGst-vQ5bvGx-oqP4tzyBwyKclQnReSEGmShm1KuXA'

for page in range(1, 6):
    req = urllib.request.Request('http://localhost:3000/api/feed?page=' + str(page) + '&limit=24', headers={'Authorization': 'Bearer ' + TOKEN})
    with urllib.request.urlopen(req) as r:
        data = json.load(r)
    ids = [item['_id'] for item in data.get('items', [])]
    print('PAGE', page, 'ITEMS', len(ids), 'UNIQUE', len(set(ids)), 'DUPES', len(ids)-len(set(ids)), 'META_HASMORE', data.get('meta', {}).get('hasMore'))
