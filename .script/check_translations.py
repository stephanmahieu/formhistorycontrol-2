from json import load, dump
import os
import argparse

locale_path = "_locales"
base_locale = "en"
skip_locales = ["fr", "es"]

locale_files = ['messages.json', 'datatables.json']

parser = argparse.ArgumentParser()
parser.add_argument("--fix", help="create a fix file with proper sorting and missing keys added", action='store_true')
args = parser.parse_args()

create_fixfile = args.fix


# -------------------------------------------------------
def check_locale_message(base_msg, other_msg, other_path):
    other_msg_fixed = {}
    okay = True
    for key in base_msg:
        if key not in other_msg:
            print('  {:25} key missing'.format(key))
            okay = False
            other_msg_fixed['XXX'+key] = base_msg[key]
        else:
            other_msg_fixed[key] = other_msg[key]

    if okay:
        print(f'  no missing keys')

    if create_fixfile:
        other_fixed_path = other_path + '.fix'
        with open(other_fixed_path, 'w+', encoding='utf-8') as fix:
            dump(other_msg_fixed, fix, sort_keys=False, indent=2, ensure_ascii=False)
# ---------------------------------------------------------


print('\n### Checking translations ###')

# check messages.json and datatables.json
for locale_file_name in locale_files:
    # load the base locale
    base_messages_path = os.path.join(locale_path, base_locale, locale_file_name)
    with open(base_messages_path, 'r', encoding='utf-8') as f:
        base_message = load(f)

    # check every locale against the base locale
    for root, dirs, files in os.walk(os.path.join(locale_path)):
        for name in files:
            if name == locale_file_name:
                messages_path = os.path.join(root, name)
                cur_locale = messages_path.split('\\')[1]
                if base_locale != cur_locale and cur_locale not in skip_locales:
                    print(f'\n{messages_path}')
                    with open(messages_path, 'r', encoding='utf-8') as f:
                        message = load(f)
                    check_locale_message(base_message, message, messages_path)

# finished
print('\nfinished.')
