from json   import load, dump
from shutil import copytree, rmtree, ignore_patterns, make_archive
import os, sys

sourceDirectoryPath  = "."
distDirectoryPath    = ".dist"
distSubDirectoryPath = os.path.join(distDirectoryPath, 'tmp')

unfinishedLocales = ['es', 'fr']
allTargets = ['firefox', 'chrome']


if len(sys.argv) < 2:
    print ('usage: release <firefox|chrome> <version-label>')
    sys.exit(0)

buildTarget = sys.argv[1]
buildLabel = sys.argv[2]



# -------------------------------------------------------
def emptydir(top):
    if top == os.sep:
        return
    else:
        for root, dirs, files in os.walk(top, topdown=False):
            for name in files:
                os.remove(os.path.join(root, name))
            for name in dirs:
                os.rmdir(os.path.join(root, name))
# -------------------------------------------------------

# -------------------------------------------------------
def cleanupLocaleMessages(msgPath):
    #Read JSON data into the datastore variable
    with open(msgPath, 'r', encoding='utf-8') as f:
        messages = load(f)

    for key in messages:
        if "description" in messages[key]:
            del messages[key]["description"]

    with open(msgPath, 'w') as f:
        #json.dump(datastore, f)
        dump(messages, f, sort_keys=False, indent=0)
# -------------------------------------------------------



print ('Creating distribution for ' + buildTarget)
print ('=================================')

# create .dist dir not exist exit
if not os.path.isdir(distDirectoryPath):
    os.mkdir(distDirectoryPath)

# if .dist not accessible exit
if not (os.access(distDirectoryPath, os.W_OK)):
    print ('Distribution directory ' + distDirectoryPath + ' not accessible!')
    sys.exit(0)

# empty .dist directory
if len(os.listdir(distDirectoryPath)) != 0:
    print ('Cleaning directory ' + distDirectoryPath)
    emptydir(distDirectoryPath)

# copy files to .dist directory
print ('Copying files')
copytree(sourceDirectoryPath, distSubDirectoryPath, ignore=ignore_patterns('.dist','.script','.git','.idea','*.zip','*.iml','README.md'))

# remove unfinished translations
print ('Removing unfinished translations')
for locale in unfinishedLocales:
    print ('- deleting ' + locale)
    rmtree( os.path.join(distSubDirectoryPath, '_locales', locale));

# cleanup messages.json files (remove the descriptions)
print ('Cleanup remaining translations')
for root, dirs, files in os.walk(os.path.join(distSubDirectoryPath, '_locales')):
    for name in files:
        if 'messages.json' in name:
            messagesPath = os.path.join(root, name)
            print ('- ' + messagesPath)
            cleanupLocaleMessages(messagesPath)

# keep the correct manifest, remove others
manifestFile = os.path.join(distSubDirectoryPath, 'manifest.json')
os.remove(manifestFile)
for target in allTargets:
    filename = 'manifest.' + target + '.json'
    targetManifestFile = os.path.join(distSubDirectoryPath, filename)
    if os.path.isfile(targetManifestFile):
        if not buildTarget in target:
            print ('Remove file ' + filename)
            os.remove(targetManifestFile)
        else:
            print ('Rename ' + filename + ' to ' + 'manifest.json')
            os.rename(targetManifestFile, manifestFile)

# zipping
zipName = 'formhistory_' + buildTarget + '_' + buildLabel
zipPath = os.path.join(distDirectoryPath, zipName)
print ('Creating ' + zipName + '.zip')
make_archive(zipPath, 'zip', distSubDirectoryPath)
