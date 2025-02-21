
export const $ = id => document.getElementById(id);

export const uiConfig = {
  selectors: {
      editor: "editor",
      connectionsSVG: "connections",
      sidebar: "sidebar",
      addItemButton: "addItem",
      addNodeButton: "addNode",
      editItemModal: "editItemModal",
      addConditionButton: "addCondition",
      conditionsList: "conditionsList",
      addFlagButton: "addFlag",
      flagsList: "flagsList",
      duplicateNodeButton: "duplicateNode",
      confirmItemButton: "confirmItem",
      deleteItemButton: "deleteItem",
      saveDBButton: "saveDB",
      loadDBButton: "loadDB",
      dbFileInput: "dbFileInput",
      itemTitleInput: "itemTitleInput",
      nodeElementSelector: "div.node",
      nodeTitleSelectorInNode: "div.font-semibold",
      conditionRowInputsSelector: "input, select",
      flagRowInputsSelector: "input",
      dialogueInput: "dialogueInput",
      speakerInput: "speakerInput",
      deleteNodeButtonSidebar: 'deleteNodeButtonSidebar', 
      deleteNodeModal: 'deleteNodeModal', 
      confirmDeleteNodeButton: 'confirmDeleteNode', 
      cancelDeleteNodeButton: 'cancelDeleteNode', 
  },
  classes: {
      hidden: "hidden",
      nodeSelectedBorder: "border-2",
      nodeSelectedBorderColor: "border-blue-500",
      conditionFlagRow: "flex space-x-2 items-center",
      inputField: "border p-1"
  },
  text: {
      selectedConnectionPrefix: "Selected: ",
      selectConnectionTargetPrompt: "Click on a node to select as connection target...",
      variablePlaceholder: "Variable",
      operatorOptions: ["=", ">", "<", "!="],
      valuePlaceholder: "Value",
      flagNamePlaceholder: "Flag Name",
      trueFalseLabel: "True/False",
      defaultItemTitlePrefix: "Choice "
  },
  events: {
      nodeSelected: "nodeSelected",
      nodeToConnect: "nodeToConnect",
      updateConnection: "updateConnection",
      editItem: "editItem"
  },
  styles: {
      panningCursor: "grabbing",
      defaultCursor: "default"
  },
  defaultNodeTitle: "Untitled" 
};

window.nodes = []
window.selectedNode = null

export let connections = [];
let currentEditItem = null,
  connectionSelectionMode = false,
  selectedConnectionTarget = null;
export let dbInstance = null;

export const editor = $(uiConfig.selectors.editor),
  svg = $(uiConfig.selectors.connectionsSVG),
  sidebar = $(uiConfig.selectors.sidebar),
  addItemButton = $(uiConfig.selectors.addItemButton),
  addNodeButton = $(uiConfig.selectors.addNodeButton),
  editItemModal = $(uiConfig.selectors.editItemModal),
  addConditionBtn = $(uiConfig.selectors.addConditionButton),
  conditionsList = $(uiConfig.selectors.conditionsList),
  addFlagBtn = $(uiConfig.selectors.addFlagButton),
  flagsList = $(uiConfig.selectors.flagsList),
  duplicateNodeButton = $(uiConfig.selectors.duplicateNodeButton),
  confirmItemBtn = $(uiConfig.selectors.confirmItemButton),
  deleteItemBtn = $(uiConfig.selectors.deleteItemButton),
  saveDBButton = $(uiConfig.selectors.saveDBButton),
  loadDBButton = $(uiConfig.selectors.loadDBButton),
  dbFileInput = $(uiConfig.selectors.dbFileInput),
  itemTitleInput = $(uiConfig.selectors.itemTitleInput),
  spriteDetailModal = $('spriteDetailModal');

import {
  initDatabase,
  saveStateToDB,
  downloadDatabase,
  loadDatabaseFile
} from "./database.js";
import {
  createNode,
  makeDraggable,
  selectNode,
  duplicateNode as duplicateNodeFn
} from "./nodes.js";
import {
  createRow,
  removeRow
} from "./items.js";
import {
  updateConnections
} from "./connections.js";
import {
  commitSceneChangesToNodeData,
  resizeCanvas
} from "./sprite.js";
import { closeSidebar, iniializeSidebar } from "./sidebar.js";
  

let isPanning = false;
let panStartX, panStartY, initialScrollX, initialScrollY;

initDatabase().then(db => dbInstance = db);

editor.addEventListener("mousedown", e => {
  if (e.target !== editor || e.button != 1) return;
  e.preventDefault();
  isPanning = true;
  panStartX = e.clientX;
  panStartY = e.clientY;
  initialScrollX = window.pageXOffset;
  initialScrollY = window.pageYOffset;
  editor.style.cursor = uiConfig.styles.panningCursor;
});

document.addEventListener("mousemove", e => {
  if (!isPanning) return;
  const dx = e.clientX - panStartX;
  const dy = e.clientY - panStartY;
  window.scrollTo(initialScrollX - dx, initialScrollY - dy);
});

document.addEventListener("mouseup", (e) => {
  if (isPanning && e.button == 1) {
      isPanning = false;
      editor.style.cursor = uiConfig.styles.defaultCursor;
  }
});



saveDBButton.addEventListener("click", () => {
  saveStateToDB(dbInstance, connections);
  downloadDatabase(dbInstance);
});

loadDBButton.addEventListener("click", () => dbFileInput.click());

dbFileInput.addEventListener("change", e => {
  if (e.target.files.length)
      loadDatabaseFile(e.target.files[0], newDb => {
          dbInstance = newDb;
          loadStateFromDBToUI();
      });
});

addNodeButton.addEventListener("click", () => {
  const screenCenterX = window.innerWidth / 2 + window.pageXOffset;
  const screenCenterY = window.innerHeight / 2 + window.pageYOffset;
  const editorRect = editor.getBoundingClientRect();
  const editorAbsX = editorRect.left + window.pageXOffset;
  const editorAbsY = editorRect.top + window.pageYOffset;
  const x = screenCenterX - editorAbsX;
  const y = screenCenterY - editorAbsY;
  createNode(x, y, editor, makeDraggable);
});

window.addEventListener("load", () => {
  const editorRect = editor.getBoundingClientRect();
  const editorAbsX = editorRect.left + window.pageXOffset;
  const editorAbsY = editorRect.top + window.pageYOffset;
  const editorCenterX = editorAbsX + editorRect.width / 2;
  const editorCenterY = editorAbsY + editorRect.height / 2;
  const viewportCenterX = window.innerWidth / 2;
  const viewportCenterY = window.innerHeight / 2;
  const targetScrollX = editorCenterX - viewportCenterX;
  const targetScrollY = editorCenterY - viewportCenterY;
  window.scrollTo({
      left: targetScrollX,
      top: targetScrollY,
      behavior: "auto"
  });
});

editor.addEventListener(uiConfig.events.nodeSelected, e => {
  if (connectionSelectionMode || !sidebar.classList.contains(uiConfig.classes.hidden)) {
    closeSidebar()
  }
  selectNode(e.detail.node);
});

window.addEventListener("keyup", e => {
  if (e.key === "Escape") {
    closeSidebar()
  }
});

editor.addEventListener(uiConfig.events.updateConnection, () => updateConnections(connections));

editor.addEventListener("click", e => {
  if (e.target === editor) {
    closeSidebar()
  }
});

const buildConditionRow = (cond = {}) => {
  const row = document.createElement("div");
  row.className = uiConfig.classes.conditionFlagRow;
  const variable = Object.assign(document.createElement("input"), {
      type: "text",
      placeholder: uiConfig.text.variablePlaceholder,
      className: uiConfig.classes.inputField,
      value: cond.variable || ""
  });
  const operator = document.createElement("select");
  operator.className = uiConfig.classes.inputField;
  uiConfig.text.operatorOptions.forEach(op => {
      const option = document.createElement("option");
      option.value = op;
      option.textContent = op;
      if (op === cond.operator) option.selected = true;
      operator.appendChild(option);
  });
  const value = Object.assign(document.createElement("input"), {
      type: "text",
      placeholder: uiConfig.text.valuePlaceholder,
      className: uiConfig.classes.inputField,
      value: cond.value || ""
  });
  row.append(variable, operator, value);
  return row;
};

const buildFlagRow = (flag = {}) => {
  const row = document.createElement("div");
  row.className = uiConfig.classes.conditionFlagRow;
  const flagName = Object.assign(document.createElement("input"), {
      type: "text",
      placeholder: uiConfig.text.flagNamePlaceholder,
      className: uiConfig.classes.inputField,
      value: flag.flagName || ""
  });
  const label = document.createElement("label");
  label.className = "flex items-center space-x-1"; 
  const checkbox = Object.assign(document.createElement("input"), {
      type: "checkbox",
      checked: flag.value || false
  });
  label.append(checkbox, document.createTextNode(uiConfig.text.trueFalseLabel));
  row.append(flagName, label);
  return row;
};

addItemButton.addEventListener("click", () => {
  if (!window.selectedNode) return;
  editor.style.transform = "";
  conditionsList.innerHTML = "";
  flagsList.innerHTML = "";
  selectedConnectionTarget = null;
  itemTitleInput.value = "";
  editItemModal.classList.remove(uiConfig.classes.hidden);
  currentEditItem = {
      nodeId: window.selectedNode.dataset.id
  };
});

addConditionBtn.addEventListener("click", () => conditionsList.appendChild(buildConditionRow()));

addFlagBtn.addEventListener("click", () => flagsList.appendChild(buildFlagRow()));

document.addEventListener(uiConfig.events.editItem, e => {
  console.log("Editing It")
  const {
      row
  } = e.detail;
  console.log(row.dataset)
  let old = connections.filter(e => e.from.itemId == row.dataset.itemId)
  if (old.length > 0) {
      old = old[0]
      $("connections").removeChild(old.line)
      connections.splice(connections.indexOf(old), 1)
  }
  conditionsList.innerHTML = "";
  flagsList.innerHTML = "";
  itemTitleInput.value = row.itemDetails?.title || "";
  (row.itemDetails?.conditions || []).forEach(cond => conditionsList.appendChild(buildConditionRow(cond)));
  (row.itemDetails?.flags || []).forEach(flag => flagsList.appendChild(buildFlagRow(flag)));
  currentEditItem = {
      nodeId: row.parentElement.parentElement.dataset.id,
      editingRow: row
  };
  editItemModal.classList.remove(uiConfig.classes.hidden);
  let svg = document.getElementById("connections") 
  const nodeData = window.nodes.find(n => n.id === currentEditItem.nodeId);
  removeRow(nodeData, connections, row, svg)
});

confirmItemBtn.addEventListener("click", () => {
  commitSceneChangesToNodeData()
  if (!currentEditItem) return;
  const nodeData = window.nodes.find(n => n.id === currentEditItem.nodeId);
  if (!nodeData) return;
  const conditions = [...conditionsList.children].map(div => {
      const [variable, operator, value] = div.querySelectorAll(uiConfig.selectors.conditionRowInputsSelector);
      return {
          variable: variable.value,
          operator: operator.value,
          value: value.value
      };
  });
  const flags = [...flagsList.children].map(div => {
      const [flagName, checkbox] = div.querySelectorAll(uiConfig.selectors.flagRowInputsSelector);
      return {
          flagName: flagName.value,
          value: checkbox.checked
      };
  });
  const title = itemTitleInput.value;
  const details = {
      title,
      conditions,
      flags,
      connectionTarget: selectedConnectionTarget
  };
  console.log(currentEditItem)
  createRow(nodeData, details, svg, connections, currentEditItem.itemDetails ? currentEditItem.itemDetails.itemId : null);
  editItemModal.classList.add(uiConfig.classes.hidden);
  currentEditItem = null;
  selectNode(nodeData.element, sidebar, editor);
});

deleteItemBtn.addEventListener("click", () => {
  if (!currentEditItem) return;
  const nodeData = window.nodes.find(n => n.id === currentEditItem.nodeId);
  if (!nodeData) return;
  commitSceneChangesToNodeData();
  editItemModal.classList.add(uiConfig.classes.hidden);
  currentEditItem = null;
  selectNode(nodeData.element, sidebar, editor);
});

async function loadStateFromDBToUI() {
  console.log(connections)
  connections = []
  const connection = $('connections');
  while (connection.firstChild) {
    connection.removeChild(connection.lastChild);
  }
  window.nodes = [];
  editor.querySelectorAll(uiConfig.selectors.nodeElementSelector).forEach(n => n.remove());
  spriteList.innerHTML = '';
  const nodeRows = dbInstance.exec("SELECT * FROM nodes")[0]?.values || [];
  nodeRows.forEach(([id, x, y, title]) => {
      const nodeData = createNode(x, y, editor, makeDraggable, {
          id,
          title: title || uiConfig.defaultNodeTitle
      });
      const sceneData = dbInstance.exec(`SELECT background_file_id, dialogue, speaker, speaker_color FROM scenes WHERE node_id = ?`, [id])[0]?.values?.[0];
      if (sceneData) {
          const [background_file_id, dialogue, speaker, speaker_color] = sceneData;
          let background_image = null;
          if (background_file_id) {
              const fileData = dbInstance.exec(`SELECT base64_data FROM files WHERE id = ?`, [background_file_id])[0]?.values?.[0]?.[0];
              background_image = fileData || null;
          }
          nodeData.scene.background = background_image;
          nodeData.dialogue = dialogue || "";
          nodeData.speaker = speaker || "";
          nodeData.speakerColor = speaker_color || null
      }
      const spriteRows = dbInstance.exec(`SELECT id, file_id, x, y, width, height, focus, animation_class, continuity_id, flip, zIndex FROM sprites WHERE scene_node_id = ?`, [id])[0]?.values || [];
      spriteRows.forEach(([spriteId, file_id, spriteX, spriteY, width, height, focus, animation_class, continuity_id, flip, zIndex]) => {
          let src = null;
          if (file_id) {
              const fileData = dbInstance.exec(`SELECT base64_data FROM files WHERE id = ?`, [file_id])[0]?.values?.[0]?.[0];
              src = fileData || null;
          }
          const spriteDataObject = {
              src,
              x: spriteX,
              y: spriteY,
              width,
              height,
              focus: focus === 1,
              animationClass: animation_class || '',
              continuityIdentifier: continuity_id || '',
              flip: flip,
              zIndex: zIndex
          };
          nodeData.scene.sprites.push(spriteDataObject);
      });
  });
  const itemRows = dbInstance.exec("SELECT id, node_id, title, connection_target_node_id FROM items")[0]?.values || [];
  itemRows.forEach(([itemId, nodeId, title, connection_target_node_id]) => {
      const nodeData = window.nodes.find(n => n.id === nodeId);
      if (nodeData) {
          const itemDetails = {
              title: title || `${uiConfig.text.defaultItemTitlePrefix}${itemId}`,
              connectionTarget: connection_target_node_id || null,
              conditions: [],
              flags: []
          };
          const conditionRows = dbInstance.exec(`SELECT variable, operator, value FROM conditions WHERE item_id = ?`, [itemId])[0]?.values || [];
          conditionRows.forEach(([variable, operator, value]) => {
              itemDetails.conditions.push({
                  variable,
                  operator,
                  value
              });
          });
          const flagRows = dbInstance.exec(`SELECT flag_name, value FROM flags WHERE item_id = ?`, [itemId])[0]?.values || [];
          flagRows.forEach(([flag_name, value]) => {
              itemDetails.flags.push({
                  flagName: flag_name,
                  value: value === 1
              });
          });
          console.log(connections)
          createRow(nodeData, itemDetails, svg, connections, itemId);
          const lastRow = nodeData.rows[nodeData.rows.length - 1];
          lastRow.row.dataset.itemId = itemId;
      }
  });
  updateConnections(connections);
  console.log("State loaded from database with optimized schema (base64 data loaded from files table).");
}

function animate() {
  updateConnections(connections);
  requestAnimationFrame(animate);
  resizeCanvas()
}
requestAnimationFrame(animate);

iniializeSidebar();


  $('parseScript').addEventListener('click', () => {
    $('parseScriptModal').classList.remove('hidden');
  });

  $('parseScriptClose').addEventListener('click', () => {
    $('parseScriptModal').classList.add('hidden');
  });

  $('parseScriptSubmit').addEventListener('click', () => {
    const scriptText = $('scriptInput').value.trim();
    if (!scriptText) { 
      alert("Its empty"); 
      return; 
    }
    
    const groups = scriptText.split(/\n\s*\n/);
    groups.forEach((group, groupIndex) => {
      const lines = group.split('\n').filter(line => line.trim() !== '');
      const groupNodes = [];
      lines.forEach((line, index) => {
        const parts = line.split(':');
        if (parts.length < 2) return; 
        const speaker = parts[0].trim();
        const dialogue = parts.slice(1).join(':').trim();
        
        let x = 100 + index * 250;
        let y = 100 + groupIndex * 150;        
        
        const screenCenterX = window.innerWidth / 2 + window.pageXOffset;
        const screenCenterY = window.innerHeight / 2 + window.pageYOffset;
        const editorRect = editor.getBoundingClientRect();
        const editorAbsX = editorRect.left + window.pageXOffset;
        const editorAbsY = editorRect.top + window.pageYOffset;
        x += screenCenterX - editorAbsX;
        y += screenCenterY - editorAbsY;
        const newNode = createNode(x, y, document.getElementById('editor'), makeDraggable, { title: speaker });
        newNode.dialogue = dialogue;
        newNode.speaker = speaker;
        groupNodes.push(newNode);
      });
      
      for (let i = 0; i < groupNodes.length - 1; i++) {
        const currentNode = groupNodes[i];
        const nextNode = groupNodes[i+1];
        const itemDetails = {
          title: "PRE_CONT",
          connectionTarget: nextNode.id,
          conditions: [],
          flags: []
        };
        
        createRow(currentNode, itemDetails, document.getElementById('connections'), connections);
      }
    });
    
    $('parseScriptModal').classList.add('hidden');
  });