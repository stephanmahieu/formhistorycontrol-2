'use strict';

function saveOptions(e) {
  browser.storage.local.set({
    myUserPref: document.querySelector("#myUserPref").value
  });
  e.preventDefault();
}

function restoreOptions() {
  let gettingItem = browser.storage.local.get('myUserPref');
  gettingItem.then((res) => {
    document.querySelector("#myUserPref").value = res.myUserPref || 'Firefox says hello.';
  });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector("form").addEventListener("submit", saveOptions);