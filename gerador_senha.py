import bcrypt

senha = b"rafael123"
hash = bcrypt.hashpw(senha, bcrypt.gensalt())

print(hash.decode())