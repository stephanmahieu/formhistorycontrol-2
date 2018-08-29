from json import load, dump
from shutil import copytree, rmtree, ignore_patterns, make_archive
import os
import sys
import stat
import re

sourceDirectoryPath = "."
distDirectoryPath = ".dist"
distSubDirectoryPath = os.path.join(distDirectoryPath, 'tmp')

unfinishedLocales = ['es', 'fr']
allTargets = ['firefox', 'chrome']


if len(sys.argv) < 1:
    print('usage: release <firefox|chrome>')
    sys.exit(0)

buildTarget = sys.argv[1]


# -------------------------------------------------------
def remove_dir(top):
    def _remove_readonly(func, path, _):
        # clear the readonly bit and reattempt removal
        os.chmod(path, stat.S_IWRITE)
        func(path)

    if top == os.sep:
        return
    else:
        for aRoot, aDirs, aFiles in os.walk(top, topdown=False):
            for fileName in aFiles:
                os.remove(os.path.join(aRoot, fileName))
            for pathName in aDirs:
                rmtree(os.path.join(aRoot, pathName), onerror=_remove_readonly)
# -------------------------------------------------------


# -------------------------------------------------------
def cleanup_locale_messages(msg_path):
    with open(msg_path, 'r', encoding='utf-8') as f:
        messages = load(f)

    for key in messages:
        if "description" in messages[key]:
            del messages[key]["description"]

    with open(msg_path, 'w') as f:
        dump(messages, f, sort_keys=False, indent=2)
# -------------------------------------------------------


# -------------------------------------------------------
def version_from_manifest(manifest_path):
    with open(manifest_path, 'r', encoding='utf-8') as f:
        manifest = load(f)
    return manifest['version']
# -------------------------------------------------------


filename = 'manifest.' + buildTarget + '.json'
fhcVersion = version_from_manifest(filename)
print(f'Creating FHC ver {fhcVersion} distribution for {buildTarget}')
print('=================================================')

# create .dist dir not exist exit
if not os.path.isdir(distDirectoryPath):
    os.mkdir(distDirectoryPath)

# if .dist not accessible exit
if not (os.access(distDirectoryPath, os.W_OK)):
    print(f'Distribution directory {distDirectoryPath} not accessible!')
    sys.exit(0)

# empty .dist directory
if len(os.listdir(distDirectoryPath)) != 0:
    print(f'Cleaning directory {distDirectoryPath}')
    remove_dir(distDirectoryPath)

# copy files to .dist directory
print('Copying files to .dist directory')
ignorefiles = ignore_patterns('.dist', '.script', '.git', '.idea', '*.zip', '*.iml', '*.bak', 'todo-list.md', '*.md')
copytree(sourceDirectoryPath, distSubDirectoryPath, ignore=ignorefiles)

# remove unfinished translations
print('Removing unfinished translations')
for locale in unfinishedLocales:
    rmLocale = os.path.join(distSubDirectoryPath, '_locales', locale)
    print(f'  delete: {rmLocale}')
    rmtree(rmLocale)

# cleanup messages.json files (remove the descriptions)
print('Cleanup remaining translations')
for root, dirs, files in os.walk(os.path.join(distSubDirectoryPath, '_locales')):
    for name in files:
        if 'messages.json' in name:
            messagesPath = os.path.join(root, name)
            print(f'  cleanup: {messagesPath}')
            cleanup_locale_messages(messagesPath)

# keep the target manifest, remove all others
manifestFile = os.path.join(distSubDirectoryPath, 'manifest.json')
os.remove(manifestFile)
for target in allTargets:
    filename = 'manifest.' + target + '.json'
    targetManifestFile = os.path.join(distSubDirectoryPath, filename)
    if os.path.isfile(targetManifestFile):
        if buildTarget not in target:
            print(f'Remove file {filename}')
            os.remove(targetManifestFile)
        else:
            print(f'Rename {filename} to manifest.json')
            os.rename(targetManifestFile, manifestFile)

# version label is fhc version without .
versionLabel = re.sub('[.]', '', fhcVersion)

# zipping
zipName = 'formhistory_' + buildTarget + '_' + versionLabel
zipPath = os.path.join(distDirectoryPath, zipName)
print(f'Creating {zipName}.zip')
make_archive(zipPath, 'zip', distSubDirectoryPath)
