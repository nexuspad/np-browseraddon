function loadFolderTree(sessionId, callBackFunc) {
  if (!sessionId) {
    window.location = "login.htm";
  }

  if (!folderTree) {
    getUuid(function(uuid) {
      fetch(apiHost + 'bookmark/folders', {
        mode: "cors",
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          'uuid': uuid,
          'utoken': sessionId
        }
      })
      .then(function(response) {
        return response.json();
      }).then(function(jsonData) {
        if (jsonData && jsonData.folders) {
          folders = jsonData.folders;
          // make sure attributes are initiated
          for (let i=0; i<folders.length; i++) {
            folders[i].subFolders = [];
          }
          folderTree = convertToTree(jsonData.folders);
          callBackFunc(folderTree);
        } else {
        }
      }).catch(function(error) {
        console.log(error);
      });	
    });

  } else {
    callBackFunc(folderTree);
  }
}

function collapseRollup(anchor) {
	var arr = anchor.id.split('-');
	var level = arr[1];
	var index = arr[2];
  var subFolderId = '#FolderTree-' + level + '-' + index;
  if (element(subFolderId).classList.contains('minus')) {
    elementHide(subFolderId);
    anchor.classList.remove('minus');
    anchor.classList.add('plus');
  } else if (element(subFolderId).classList.contains('plus')) {
    elementShow(subFolderId);
    anchor.classList.remove('plus');
    anchor.classList.add('minus');
  }
}

function convertToTree(folderArr) {
  let tree = [];
  tree.push({
    folderId: 0,
    level: 0,
    folderName: 'root folder',
    subFolders: []
  });

  // Add the child folders
  let MAX_ITERATION = folderArr.length * folderArr.length;
  let iterationCount = 0;

  while (folderArr.length > 0) {
    if (iterationCount > MAX_ITERATION) {
      throw new Error('Folder tree reached max iteration.');
    }

    let lengthBefore = folderArr.length;

    for (let i = folderArr.length - 1; i >= 0; i--) {
      iterationCount++;

      if (addChildNodeToFolderTree(tree, folderArr[i], 1)) {
        folderArr.splice(i, 1);
      }
    }

    if (folderArr.length === lengthBefore) {
      break;
    }
  }

  // Add the remaining folders to the ROOT level.
  for (let i = folderArr.length - 1; i >= 0; i--) {
    folderArr[i].parent.folderId = 0;
    folderArr[i].level = 1;
    tree.push(folderArr[i]);
    folderArr.splice(i, 1);
  }

  sortFolderTree(tree);

  return tree;
}

function addChildNodeToFolderTree (tree, folder, level) {
  let len = tree.length;

  for (let i = 0; i < len; i++) {
    if (tree[i].folderId === folder.parent.folderId) {
      folder.level = level;
      tree[i].subFolders.push(folder);
      return true;
    } else if (tree[i].subFolders.length > 0) {
      if (addChildNodeToFolderTree(tree[i].subFolders, folder, level + 1)) {
        return true;
      }
    }
  }
  return false;
}

function sortFolderTree (tree) {
  tree.sort(function (f1, f2) {
    let name1 = f1.folderName.toUpperCase();
    let name2 = f2.folderName.toUpperCase();

    if (name1 < name2) {
      return -1;
    }

    if (name1 > name2) {
      return 1;
    }

    return 0;
  });

  let len = tree.length;
  for (let i = 0; i < len; i++) {
    if (tree[i].subFolders.length > 0) {
      sortFolderTree(tree[i].subFolders);
    }
  }
}

var count = 1;
function findFolderInTree(treeBranch, folderId) {
  count ++;
  if (count > 1000) {
    return;
  }

  for (let i = 0; i < treeBranch.length; i++) {
    if (treeBranch[i].folderId === folderId) {
      return treeBranch[i];
    } else {
      let f = findFolderInTree(treeBranch[i].subFolders, folderId);
      if (f) return f;
    }
  }

  return false;
}


function displayTree(node) {
  let icon = '<i class="far fa-folder fa-fw"></i>';
  if (node.subFolders.length > 0) {
    if (node.folderId === 0) {
      icon = `<i class="far fa-folder-open fa-fw" id="Node-${node.folderId}"></i>`;
    } else {
      icon = `<i class="far fa-plus-square fa-fw np-subfolder-toggle" id="Node-${node.folderId}"></i>`;
    }
  }
  
  let hideSubFolders = '';
  if (node.level > 0) {
    hideSubFolders = 'display:none;';
  }

  // start building the display of the node
  let nodeContent = '';
  
  if (node.subFolders.length > 0) {
    nodeContent = `<li>${icon}<span class="np-folder-entry" id="Folder-${node.folderId}">${node.folderName}</span>`;
    nodeContent += `<ul class="list-unstyled" id="Node-${node.folderId}-SubFolders" style="padding-left:1em; ${hideSubFolders}">`;
    for (let i=0; i<node.subFolders.length; i++) {
      nodeContent += displayTree(node.subFolders[i]);
    }
    nodeContent += '</ul>';
    nodeContent += '</li>';
  } else {
    nodeContent = `<li>${icon}<span class="np-folder-entry" id="Folder-${node.folderId}">${node.folderName}</span></li>`;
  }

  // wrap around the whole thing in a ul
  if (node.folderId === 0) {
    nodeContent = '<ul class="list-unstyled pl-2 pr-4">' + nodeContent + '</ul>';
  }
  return nodeContent;
}