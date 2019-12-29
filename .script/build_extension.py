from json import load, dump
from shutil import copytree, rmtree, ignore_patterns, make_archive
import os
import sys
import stat
import re
import argparse

sourceDirectoryPath = "."
distDirectoryPath = ".dist"

allTargets = ['firefox', 'chrome']
unfinishedLocales = ['es', 'fr']

parser = argparse.ArgumentParser()
parser.add_argument("buildTarget", help="the target to build", choices=allTargets)
args = parser.parse_args()

buildTarget = args.buildTarget
distSubDirectoryPath = os.path.join(distDirectoryPath, 'dist_' + buildTarget)


# -------------------------------------------------------
def remove_readonly_flag(func, path, _):
    # clear the readonly bit and reattempt removal
    os.chmod(path, stat.S_IWRITE)
    func(path)
# -------------------------------------------------------


# -------------------------------------------------------
def remove_dir(top):
    if top == os.sep:
        return
    else:
        for aRoot, aDirs, aFiles in os.walk(top, topdown=False):
            for fileName in aFiles:
                os.remove(os.path.join(aRoot, fileName))
            for pathName in aDirs:
                rmtree(os.path.join(aRoot, pathName), onerror=remove_readonly_flag)
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


# -------------------------------------------------------
def remove_script_line(filepath, substring):
    found = False
    with open(filepath, 'r') as f:
        content = []
        for line in f.readlines():
            # print(line)
            if substring not in line:
                content.append(line)
            else:
                found = True
    if found:
        print(f'  remove script reference from {filepath}')
        with open(filepath, 'w') as f:
            f.writelines(content)
# -------------------------------------------------------


# -------------------------------------------------------
def post_process_firefox():
    script = 'browser-polyfill.min.js'
    print('Post processing firefox:')

    # remove the script itself
    print(f'  remove script {script}')
    os.remove(os.path.join(distSubDirectoryPath, 'common', script))

    # remove reference from manifest
    remove_script_line(os.path.join(distSubDirectoryPath, 'manifest.json'), script)

    # remove reference from html files
    for aRoot, aDirs, aFiles in os.walk(os.path.join(distSubDirectoryPath, 'popup'), topdown=False):
        for fname in aFiles:
            if fname.endswith('.html'):
                file_to_check = os.path.join(aRoot, fname)
                remove_script_line(file_to_check, script)
# -------------------------------------------------------


# -------------------------------------------------------
def post_process_chrome():
    print('Post processing chrome:')
    pageaction_path = os.path.join(distSubDirectoryPath, 'popup', 'pageaction')
    print(f'  Remove {pageaction_path}')
    rmtree(pageaction_path, onerror=remove_readonly_flag)
# -------------------------------------------------------


filename = 'manifest.' + buildTarget + '.json'
fhcVersion = version_from_manifest(filename)
print('=' * 80)
print(f'Creating FHC ver {fhcVersion} distribution for {buildTarget}')
print('=' * 80)

# create .dist dir not exist exit
if not os.path.isdir(distDirectoryPath):
    os.mkdir(distDirectoryPath)

# if .dist not accessible exit
if not (os.access(distDirectoryPath, os.W_OK)):
    print(f'Distribution directory {distDirectoryPath} not accessible!')
    sys.exit(0)

# if .dist/tmp_target directory exists remove it
if os.path.isdir(distSubDirectoryPath):
    rmtree(distSubDirectoryPath, onerror=remove_readonly_flag)

# copy files to .dist/temp_target directory
print(f'Copying files to .dist/temp_{buildTarget} directory')
ignorefiles = ignore_patterns(
    '.dist', '.script', '.git', '.gitignore', '.idea', '*.zip', '*.iml', '*.bak', 'todo-list.md', '*.md')
copytree(sourceDirectoryPath, distSubDirectoryPath, ignore=ignorefiles)

# remove unfinished translations
print('Removing unfinished translations:')
for locale in unfinishedLocales:
    rmLocale = os.path.join(distSubDirectoryPath, '_locales', locale)
    print(f'  delete: {rmLocale}')
    rmtree(rmLocale, onerror=remove_readonly_flag)

# cleanup messages.json files (remove descriptions)
print('Cleanup remaining translations:')
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

# post target processing
if buildTarget == 'firefox':
    post_process_firefox()
if buildTarget == 'chrome':
    post_process_chrome()

# version label is fhc version without .
versionLabel = re.sub('[.]', '', fhcVersion)

# zipping
zipName = 'formhistory_' + buildTarget + '_' + versionLabel
zipPath = os.path.join(distDirectoryPath, zipName)
print(f'Creating {zipName}.zip')
make_archive(zipPath, 'zip', distSubDirectoryPath)

print('=' * 80)
print('Finished!')
