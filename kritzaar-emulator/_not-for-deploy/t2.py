from playwright.sync_api import sync_playwright
BASE='http://localhost:8123'
with sync_playwright() as p:
    b=p.chromium.launch(args=['--no-sandbox'])
    page=b.new_context().new_page()
    page.on('pageerror',lambda e: print('PAGEERROR',e, getattr(e,'stack','')[:600]))
    page.on('console',lambda m: print('CONSOLE',m.type,m.text[:300]))
    page.goto(BASE+'/js/storage-test.html')
    page.get_by_role('button',name='Run tests').click(); page.wait_for_timeout(8000)
    print(page.inner_text('body')[-2500:])
    b.close()
