#!/usr/bin/env python3
"""Fail-closed Arsenal SFTP release. No passwords/keys are stored in code."""
import base64
import datetime as dt
import hashlib
import os
import posixpath
import stat
import sys
import uuid
import zipfile
from pathlib import PurePosixPath

import paramiko

PAGES = {'index.html','navesy.html','garazhi.html','lestnicy.html',
         'ograzhdeniya.html','terrasy.html','vhodnye-gruppy.html',
         'svarka.html','arsenal-privacy.html'}
OTHERS = {'favicon.ico','apple-touch-icon.png','robots.txt','sitemap.xml','.htaccess'}

def required(name):
    value = os.getenv(name, '').strip()
    if not value:
        raise RuntimeError('Missing GitHub environment secret: '+name)
    return value

def exists(sftp, path):
    try:
        sftp.stat(path)
        return True
    except OSError as exc:
        if exc.errno == 2:
            return False
        raise

def mkdirs(sftp, path):
    if path in ('', '.', '/'):
        return
    if exists(sftp,path):
        if not stat.S_ISDIR(sftp.stat(path).st_mode):
            raise RuntimeError('Not a directory: '+path)
        return
    mkdirs(sftp, posixpath.dirname(path))
    sftp.mkdir(path)

def atomic_write(sftp, path, data):
    tmp = path+'.dashbyte-tmp-'+uuid.uuid4().hex[:12]
    try:
        with sftp.open(tmp,'wb') as out:
            for start in range(0,len(data),65536):
                out.write(data[start:start+65536])
            out.flush()
        if sftp.stat(tmp).st_size != len(data):
            raise RuntimeError('Transfer size mismatch: '+path)
        # Abort if the SFTP server lacks the OpenSSH POSIX-rename extension.
        sftp.posix_rename(tmp,path)
        if sftp.stat(path).st_size != len(data):
            raise RuntimeError('Final size mismatch: '+path)
    finally:
        if exists(sftp,tmp):
            sftp.remove(tmp)

def main():
    host=required('ARSENAL_SFTP_HOST')
    user=required('ARSENAL_SFTP_USER')
    password=required('ARSENAL_SFTP_PASSWORD')
    port=int(os.getenv('ARSENAL_SFTP_PORT','').strip() or '22')
    if not 1 <= port <= 65535:
        raise RuntimeError('Invalid SFTP port')
    root_raw=required('ARSENAL_SFTP_REMOTE_DIR')
    root=posixpath.normpath(root_raw)
    if (root in ('','/','.') or posixpath.basename(root)!='navesy59.ru'
            or '..' in PurePosixPath(root_raw).parts):
        raise RuntimeError('Refusing to deploy outside an explicit navesy59.ru directory')
    expected=required('ARSENAL_SFTP_HOST_KEY_SHA256')
    if not expected.startswith('SHA256:'):
        raise RuntimeError('Host key fingerprint must start with SHA256:')
    with zipfile.ZipFile('arsenal-upload.zip') as z:
        names=[n for n in z.namelist() if not n.endswith('/')]
        for n in names:
            p=PurePosixPath(n)
            if (p.is_absolute() or '..' in p.parts or chr(0) in n
                    or not (n in PAGES|OTHERS or n.startswith('assets/'))):
                raise RuntimeError('Invalid archive member '+repr(n))
        if not PAGES <= set(names):
            raise RuntimeError('Incomplete archive')
        payloads={n:z.read(n) for n in names}
    transport=paramiko.Transport((host,port))
    try:
        transport.start_client(timeout=20)
        key=transport.get_remote_server_key()
        actual='SHA256:'+base64.b64encode(
            hashlib.sha256(key.asbytes()).digest()).decode().rstrip('=')
        if actual != expected:
            raise RuntimeError('Server identity mismatch ('+key.get_name()+', '+actual+
                               '); check the fingerprint directly with REG.RU')
        # Only authenticate after the known server identity has been verified.
        transport.auth_password(username=user,password=password,fallback=False)
        if not transport.is_authenticated():
            raise RuntimeError('SFTP login failed')
        sftp=paramiko.SFTPClient.from_transport(transport)
        if sftp is None:
            raise RuntimeError('Server does not support SFTP')
        try:
            home=posixpath.join(root,'index.html')
            if not exists(sftp,home):
                raise RuntimeError('Missing current index.html; refusing to deploy')
            with sftp.open(home,'rb') as fh:
                current=fh.read(100000).decode('utf-8','ignore').lower()
            if 'арсенал' not in current and 'arsenal' not in current:
                raise RuntimeError('Selected site does not appear to be Arsenal')
            # Check writable target and atomic rename support, before making changes.
            probe=posixpath.join(root,'.dashbyte-probe-'+uuid.uuid4().hex[:12])
            try:
                with sftp.open(probe,'wb') as f: f.write(b'probe')
                sftp.posix_rename(probe,probe+'.ok')
            finally:
                for p in (probe,probe+'.ok'):
                    if exists(sftp,p): sftp.remove(p)
            # Backup *outside the publicly accessible website root* or fail safely.
            stamp=dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
            backup=posixpath.join(posixpath.dirname(root),
                                  '.dashbyte-arsenal-backups',stamp)
            mkdirs(sftp,backup)
            count=0
            for name in names:
                target=posixpath.join(root,name)
                if exists(sftp,target):
                    dest=posixpath.join(backup,name)
                    mkdirs(sftp,posixpath.dirname(dest))
                    with sftp.open(target,'rb') as f: previous=f.read()
                    atomic_write(sftp,dest,previous)
                    count+=1
            print('Backed up original files outside website root:',count)
            # Do not delete unrelated files; publish homepage last.
            ordered=sorted(names,key=lambda n:(n=='index.html',n=='.htaccess',n))
            for idx,name in enumerate(ordered,1):
                dest=posixpath.join(root,name)
                mkdirs(sftp,posixpath.dirname(dest))
                atomic_write(sftp,dest,payloads[name])
                print('Uploaded',idx,'/',len(ordered),name)
            print('ARSENAL_SFTP_DEPLOY_OK',len(ordered))
        finally:
            sftp.close()
    finally:
        transport.close()

if __name__=='__main__':
    try:
        main()
    except Exception as exc:
        print('DEPLOY_FAILED:',type(exc).__name__,str(exc),file=sys.stderr)
        sys.exit(1)
