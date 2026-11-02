# Step 4 interaction check: Dialog Esc + focus trap, Tabs arrow keys, toast. Run: python3 check-primitives.py
from playwright.sync_api import sync_playwright

with sync_playwright() as pw:
    b = pw.chromium.launch()
    p = b.new_page()
    p.goto("http://localhost:5199/styleguide", wait_until="networkidle")

    # Dialog: open, focus wraps at last item, Esc closes
    p.get_by_role("button", name="Open dialog").click()
    dlg = p.get_by_role("dialog")
    if not dlg.is_visible():
        raise SystemExit("FAIL: dialog did not open")
    dlg.get_by_role("button", name="Confirm").focus()
    p.keyboard.press("Tab")
    in_dialog = p.evaluate("document.activeElement.closest('.p-dialog') !== null")
    if not in_dialog:
        raise SystemExit("FAIL: focus escaped the dialog")
    p.keyboard.press("Escape")
    p.wait_for_timeout(100)
    if dlg.is_visible():
        raise SystemExit("FAIL: Esc did not close dialog")

    # Tabs: ArrowRight moves selection
    p.get_by_role("tab", name="Plan").focus()
    p.keyboard.press("ArrowRight")
    if p.get_by_role("tab", name="Simulate").get_attribute("aria-selected") != "true":
        raise SystemExit("FAIL: ArrowRight did not move tab selection")

    # Toast appears
    p.get_by_role("button", name="Fire toast").click()
    if not p.get_by_role("status").is_visible():
        raise SystemExit("FAIL: toast did not appear")

    print("check-primitives: all pass")
    b.close()
