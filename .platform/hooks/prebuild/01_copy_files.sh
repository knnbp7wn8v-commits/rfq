#!/bin/bash

# Másolás a .platform/files mappából a megfelelő helyre
cp -r .platform/files/cert.pem /etc/pki/tls/certs/cert.pem
cp -r .platform/files/key.pem /etc/pki/tls/certs/key.pem

# Ellenőrizd a másolás sikerességét
if [ $? -ne 0 ]; then
    echo "Error copying files."
    exit 1
fi

echo "Files copied successfully."
