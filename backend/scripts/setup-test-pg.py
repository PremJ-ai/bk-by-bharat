with open('/etc/postgresql/18/main/postgresql.conf', 'r') as f:
    c = f.read()
if "listen_addresses = '*'" not in c:
    c = c.replace("#listen_addresses = 'localhost'", "listen_addresses = '*'")
    with open('/etc/postgresql/18/main/postgresql.conf', 'w') as f:
        f.write(c)

with open('/etc/postgresql/18/main/pg_hba.conf', 'r') as f:
    hba = f.read()
if "0.0.0.0/0" not in hba:
    with open('/etc/postgresql/18/main/pg_hba.conf', 'a') as f:
        f.write("\nhost all all 0.0.0.0/0 scram-sha-256\nhost all all ::0/0 scram-sha-256\n")

print("PostgreSQL config updated successfully")

