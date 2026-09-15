// Session keepalive — ping every 10 min to prevent admin logout
setInterval(() => fetch('/admin/keepalive').catch(() => {}), 600000);
