const WORKBOOK_ID_ = '1nMhn4OlQScKTBrM1uTOuF7-U-l_8p6HJGpTlE9GMedQ';
const MAX_FILE_BYTES_ = 25 * 1024 * 1024;
const ADMIN_SESSION_SECONDS_ = 21600;
const SHEETS_ = {
  groups: {
    name: 'Grupos',
    headers: ['id', 'nombre', 'ambitos', 'estado', 'tokenHash', 'folderId', 'creada', 'actualizada']
  },
  observations: {
    name: 'Observaciones',
    headers: ['id', 'groupId', 'articulo', 'semaforo', 'quePlantea', 'problemaTension', 'principioJuego', 'propuesta', 'version', 'creada', 'actualizada']
  },
  files: {
    name: 'Archivos',
    headers: ['id', 'groupId', 'observationId', 'fileId', 'nombre', 'mimeType', 'size', 'url', 'creado']
  }
};

function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  template.configJson = jsonForHtml_({
    groupId: e && e.parameter ? String(e.parameter.g || '') : '',
    groupKey: e && e.parameter ? String(e.parameter.k || '') : ''
  });
  return template.evaluate()
    .setTitle('Ficha 8 · Reglamento General Académico')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function unlockAdmin(code) {
  assertSetup_();
  const expected = PropertiesService.getScriptProperties().getProperty('ADMIN_CODE_HASH');
  if (!expected || !constantTimeEquals_(hashSecret_(String(code || '').trim()), expected)) {
    throw new Error('El código no es correcto. Revisa que esté escrito tal como lo recibiste.');
  }
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('admin:' + hashSecret_(token), expected, ADMIN_SESSION_SECONDS_);
  return { token: token, expiresIn: ADMIN_SESSION_SECONDS_ };
}

function listGroups(adminToken) {
  requireAdmin_(adminToken);
  return withLock_(function () {
    return readRecords_(getSheet_('groups')).map(function (group) {
      return publicGroup_(group);
    }).sort(function (a, b) {
      return b.createdAt.localeCompare(a.createdAt);
    });
  });
}

function getAdminSnapshot(adminToken) {
  requireAdmin_(adminToken);
  return withLock_(function () {
    const observations = readRecords_(getSheet_('observations'));
    const files = readRecords_(getSheet_('files'));
    const groups = readRecords_(getSheet_('groups')).map(function (group) {
      const groupObservations = observations.filter(function (item) { return item.groupId === group.id; });
      return {
        summary: groupSummary_(group, groupObservations),
        observations: groupObservations.map(publicObservation_),
        files: files.filter(function (item) { return item.groupId === group.id; }).map(publicFile_)
      };
    }).sort(function (a, b) {
      return a.summary.createdAt.localeCompare(b.summary.createdAt);
    });
    return { groups: groups };
  });
}

function createGroup(adminToken, name, areas) {
  requireAdmin_(adminToken);
  return withLock_(function () {
    const webUrl = ScriptApp.getService().getUrl();
    if (!webUrl) {
      throw new Error('No se encontró la URL del despliegue. Despliega la aplicación web antes de crear grupos.');
    }
    const cleanName = cleanText_(name, 100);
    const cleanAreas = cleanText_(areas, 240);
    const sheet = getSheet_('groups');
    const groups = readRecords_(sheet);
    const groupName = cleanName || 'Grupo ' + (groups.length + 1);
    if (groups.some(function (group) { return group.nombre.toLowerCase() === groupName.toLowerCase(); })) {
      throw new Error('Ya existe un grupo con ese nombre. Elige otro para distinguir sus fichas.');
    }

    const id = Utilities.getUuid();
    const key = Utilities.getUuid() + Utilities.getUuid();
    const folder = DriveApp.getFolderById(getRootFolderId_()).createFolder('Ficha 8 · ' + groupName);
    const now = new Date().toISOString();
    sheet.appendRow([id, sheetText_(groupName), sheetText_(cleanAreas), 'Abierto', hashSecret_(key), folder.getId(), now, now]);

    return {
      group: {
        id: id,
        name: groupName,
        areas: cleanAreas,
        status: 'Abierto',
        createdAt: now,
        updatedAt: now,
        observationCount: 0,
        completion: 0
      },
      link: webUrl + '?g=' + encodeURIComponent(id) + '&k=' + encodeURIComponent(key)
    };
  });
}

function rotateGroupLink(adminToken, groupId) {
  requireAdmin_(adminToken);
  return withLock_(function () {
    const webUrl = ScriptApp.getService().getUrl();
    if (!webUrl) throw new Error('No se encontró la URL del despliegue. Vuelve a publicar la aplicación web.');
    const group = findGroup_(groupId);
    const key = Utilities.getUuid() + Utilities.getUuid();
    const now = new Date().toISOString();
    getSheet_('groups').getRange(group._row, 5, 1, 1).setValue(hashSecret_(key));
    getSheet_('groups').getRange(group._row, 8, 1, 1).setValue(now);
    return {
      link: webUrl + '?g=' + encodeURIComponent(group.id) + '&k=' + encodeURIComponent(key)
    };
  });
}

function setGroupClosed(adminToken, groupId, closed) {
  requireAdmin_(adminToken);
  return withLock_(function () {
    const group = findGroup_(groupId);
    const now = new Date().toISOString();
    getSheet_('groups').getRange(group._row, 4, 1, 1).setValue(closed ? 'Cerrado' : 'Abierto');
    getSheet_('groups').getRange(group._row, 8, 1, 1).setValue(now);
    return { status: closed ? 'Cerrado' : 'Abierto', updatedAt: now };
  });
}

function getGroupSnapshot(groupId, key) {
  return withLock_(function () {
    const group = requireGroup_(groupId, key);
    const observations = readRecords_(getSheet_('observations')).filter(function (item) {
      return item.groupId === group.id;
    }).map(publicObservation_);
    const files = readRecords_(getSheet_('files')).filter(function (item) {
      return item.groupId === group.id;
    }).map(publicFile_);
    return {
      group: publicGroup_(group),
      observations: observations,
      files: files
    };
  });
}

function saveObservation(groupId, key, observation, expectedVersion) {
  return withLock_(function () {
    const group = requireGroup_(groupId, key);
    requireOpen_(group);
    const input = observation || {};
    const data = {
      articulo: cleanText_(input.articulo, 240),
      semaforo: cleanText_(input.semaforo, 30),
      quePlantea: cleanText_(input.quePlantea, 5000),
      problemaTension: cleanText_(input.problemaTension, 5000),
      principioJuego: cleanText_(input.principioJuego, 3000),
      propuesta: cleanText_(input.propuesta, 5000)
    };
    const allowedLabels = ['Mantener', 'Revisar', 'Modificar', 'Incorporar'];
    if (allowedLabels.indexOf(data.semaforo) === -1) {
      throw new Error('Elige una opción del semáforo antes de guardar.');
    }
    if (!(data.articulo || data.quePlantea || data.problemaTension || data.principioJuego || data.propuesta)) {
      throw new Error('Completa al menos un campo de la observación antes de guardar.');
    }

    const sheet = getSheet_('observations');
    const id = cleanText_(input.id, 80);
    const now = new Date().toISOString();
    if (id) {
      const existing = readRecords_(sheet).find(function (item) {
        return item.id === id && item.groupId === group.id;
      });
      if (!existing) throw new Error('No se encontró esa observación en esta ficha. Actualiza la página e inténtalo de nuevo.');
      if (String(existing.version) !== String(expectedVersion || '')) {
        return { conflict: true };
      }
      const values = [
        data.articulo, data.semaforo, data.quePlantea, data.problemaTension,
        data.principioJuego, data.propuesta, now
      ].map(sheetText_);
      sheet.getRange(existing._row, 3, 1, 6).setValues([values.slice(0, 6)]);
      sheet.getRange(existing._row, 9, 1, 1).setValue(now);
      sheet.getRange(existing._row, 11, 1, 1).setValue(now);
      return { conflict: false, observation: publicObservation_(Object.assign({}, existing, data, { version: now, actualizada: now })) };
    }

    const newId = Utilities.getUuid();
    sheet.appendRow([
      newId, group.id, sheetText_(data.articulo), sheetText_(data.semaforo), sheetText_(data.quePlantea),
      sheetText_(data.problemaTension), sheetText_(data.principioJuego), sheetText_(data.propuesta), now, now, now
    ]);
    return {
      conflict: false,
      observation: publicObservation_(Object.assign({ id: newId, groupId: group.id, creada: now }, data, { version: now, actualizada: now }))
    };
  });
}

function uploadAttachment(form) {
  const input = form || {};
  const group = requireGroup_(String(input.groupId || ''), String(input.key || ''));
  requireOpen_(group);
  const observationId = cleanText_(input.observationId, 80);
  if (observationId) {
    const observation = readRecords_(getSheet_('observations')).some(function (item) {
      return item.id === observationId && item.groupId === group.id;
    });
    if (!observation) throw new Error('Guarda la observación antes de adjuntarle un archivo.');
  }
  const data = String(input.data || '');
  if (!data) throw new Error('Selecciona un archivo antes de subirlo.');
  if (data.length > Math.ceil(MAX_FILE_BYTES_ / 3) * 4 + 4) throw new Error('El archivo supera el límite de 25 MB.');
  const bytes = Utilities.base64Decode(data);
  if (!bytes.length) throw new Error('El archivo está vacío.');
  if (bytes.length > MAX_FILE_BYTES_) throw new Error('El archivo supera el límite de 25 MB.');
  const filename = safeFilename_(input.name);
  const mimeType = String(input.mimeType || '').toLowerCase().slice(0, 120);
  if (!isAllowedFile_(filename, mimeType)) {
    throw new Error('Este formato no está permitido. Sube un documento, una imagen o un archivo de audio.');
  }

  const blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', filename);
  const file = DriveApp.getFolderById(group.folderId).createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (error) {
    try {
      file.setTrashed(true);
    } catch (cleanupError) {
      throw new Error('Drive no permitió compartir el archivo por enlace y no se pudo eliminar la copia privada. Revisa la carpeta de este grupo en Drive.');
    }
    throw new Error('Drive no permitió habilitar el acceso por enlace para este archivo. Revisa la configuración de uso compartido de tu organización.');
  }

  const now = new Date().toISOString();
  const record = {
    id: Utilities.getUuid(),
    groupId: group.id,
    observationId: observationId,
    fileId: file.getId(),
    nombre: filename,
    mimeType: mimeType,
    size: bytes.length,
    url: file.getUrl(),
    creado: now
  };
  withLock_(function () {
    getSheet_('files').appendRow([
      record.id, record.groupId, record.observationId, record.fileId,
      sheetText_(record.nombre), sheetText_(record.mimeType), record.size, sheetText_(record.url), record.creado
    ]);
  });
  return publicFile_(record);
}

function setupFicha8_() {
  const spreadsheet = SpreadsheetApp.openById(WORKBOOK_ID_);
  Object.keys(SHEETS_).forEach(function (key) {
    const definition = SHEETS_[key];
    let sheet = spreadsheet.getSheetByName(definition.name);
    if (!sheet) sheet = spreadsheet.insertSheet(definition.name);
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      sheet.getRange(1, 1, 1, definition.headers.length).setValues([definition.headers]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, definition.headers.length).setFontWeight('bold');
    } else {
      const existingHeaders = sheet.getRange(1, 1, 1, definition.headers.length).getDisplayValues()[0];
      if (definition.headers.some(function (header, index) { return existingHeaders[index] !== header; })) {
        throw new Error('La pestaña "' + definition.name + '" ya existe con encabezados distintos. No se modificó para proteger sus datos.');
      }
    }
  });

  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty('ROOT_FOLDER_ID')) {
    const folder = DriveApp.createFolder('Ficha 8 · Reglamento General Académico');
    properties.setProperty('ROOT_FOLDER_ID', folder.getId());
  }
  properties.setProperty('SETUP_COMPLETE', 'true');

  let generatedCode = '';
  if (!properties.getProperty('ADMIN_CODE_HASH')) {
    generatedCode = Utilities.getUuid() + '-' + Utilities.getUuid();
    properties.setProperty('ADMIN_CODE_HASH', hashSecret_(generatedCode));
    console.log('Código de facilitación (cópialo ahora; no se vuelve a mostrar): ' + generatedCode);
  }
  console.log('Configuración lista. Hoja: ' + spreadsheet.getUrl());
  return generatedCode || 'La configuración ya existía; el código de facilitación se conserva.';
}

function setupFicha8() {
  return setupFicha8_();
}

function resetFacilitatorCode_() {
  const properties = PropertiesService.getScriptProperties();
  const code = Utilities.getUuid() + '-' + Utilities.getUuid();
  properties.setProperty('ADMIN_CODE_HASH', hashSecret_(code));
  console.log('Nuevo código de facilitación (cópialo ahora; no se vuelve a mostrar): ' + code);
  return code;
}

function resetFacilitatorCode() {
  return resetFacilitatorCode_();
}

function withLock_(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

function assertSetup_() {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty('SETUP_COMPLETE') !== 'true' || !properties.getProperty('ADMIN_CODE_HASH')) {
    throw new Error('La aplicación aún no está configurada. Sigue los pasos de instalación del README.');
  }
}

function requireAdmin_(token) {
  assertSetup_();
  const key = 'admin:' + hashSecret_(String(token || ''));
  const sessionCodeHash = CacheService.getScriptCache().get(key);
  const currentCodeHash = PropertiesService.getScriptProperties().getProperty('ADMIN_CODE_HASH');
  if (!sessionCodeHash || !constantTimeEquals_(sessionCodeHash, currentCodeHash)) {
    throw new Error('La sesión de facilitación venció. Ingresa nuevamente el código.');
  }
}

function requireGroup_(groupId, key) {
  assertSetup_();
  const group = findGroup_(groupId);
  if (!constantTimeEquals_(hashSecret_(String(key || '')), String(group.tokenHash || ''))) {
    throw new Error('El enlace de este grupo no es válido. Pide a la persona facilitadora que lo vuelva a compartir.');
  }
  return group;
}

function requireOpen_(group) {
  if (group.estado !== 'Abierto') throw new Error('La ficha de este grupo está cerrada. Consulta a la persona facilitadora.');
}

function findGroup_(groupId) {
  const group = readRecords_(getSheet_('groups')).find(function (item) {
    return item.id === String(groupId || '');
  });
  if (!group) throw new Error('No se encontró el grupo. Comprueba que el enlace esté completo.');
  return group;
}

function getSheet_(key) {
  assertSetup_();
  const sheet = SpreadsheetApp.openById(WORKBOOK_ID_).getSheetByName(SHEETS_[key].name);
  if (!sheet) throw new Error('Falta la pestaña "' + SHEETS_[key].name + '". Vuelve a ejecutar setupFicha8_ desde Apps Script.');
  return sheet;
}

function readRecords_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).map(function (row, index) {
    const result = { _row: index + 2 };
    headers.forEach(function (header, column) {
      result[header] = row[column] instanceof Date ? row[column].toISOString() : row[column];
    });
    return result;
  }).filter(function (record) {
    return String(record.id || '') !== '';
  });
}

function getRootFolderId_() {
  const id = PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID');
  if (!id) throw new Error('No se encontró la carpeta de Drive. Vuelve a ejecutar setupFicha8_ desde Apps Script.');
  return id;
}

function publicGroup_(group) {
  const observations = readRecords_(getSheet_('observations')).filter(function (item) {
    return item.groupId === group.id;
  });
  return groupSummary_(group, observations);
}

function groupSummary_(group, observations) {
  let completedFields = 0;
  observations.forEach(function (item) {
    ['articulo', 'semaforo', 'quePlantea', 'problemaTension', 'principioJuego', 'propuesta'].forEach(function (field) {
      if (String(item[field] || '').trim()) completedFields += 1;
    });
  });
  return {
    id: group.id,
    name: String(group.nombre || ''),
    areas: String(group.ambitos || ''),
    status: String(group.estado || 'Abierto'),
    createdAt: String(group.creada || ''),
    updatedAt: String(group.actualizada || ''),
    observationCount: observations.length,
    completion: observations.length ? Math.round(completedFields / (observations.length * 6) * 100) : 0
  };
}

function publicObservation_(item) {
  return {
    id: String(item.id || ''),
    groupId: String(item.groupId || ''),
    articulo: String(item.articulo || ''),
    semaforo: String(item.semaforo || ''),
    quePlantea: String(item.quePlantea || ''),
    problemaTension: String(item.problemaTension || ''),
    principioJuego: String(item.principioJuego || ''),
    propuesta: String(item.propuesta || ''),
    version: String(item.version || ''),
    createdAt: String(item.creada || ''),
    updatedAt: String(item.actualizada || '')
  };
}

function publicFile_(item) {
  return {
    id: String(item.id || ''),
    groupId: String(item.groupId || ''),
    observationId: String(item.observationId || ''),
    name: String(item.nombre || ''),
    mimeType: String(item.mimeType || ''),
    size: Number(item.size || 0),
    url: String(item.url || ''),
    createdAt: String(item.creado || '')
  };
}

function cleanText_(value, maxLength) {
  return String(value == null ? '' : value).replace(/\u0000/g, '').trim().slice(0, maxLength);
}

function sheetText_(value) {
  const text = String(value == null ? '' : value);
  return /^\s*[=+\-@]/.test(text) ? "'" + text : text;
}

function hashSecret_(value) {
  return Utilities.base64Encode(Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value),
    Utilities.Charset.UTF_8
  ));
}

function constantTimeEquals_(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return difference === 0;
}

function safeFilename_(name) {
  const clean = String(name || 'archivo').replace(/[\\/:*?"<>|#%{}^~[\]`]/g, '-').trim().slice(0, 180);
  return clean || 'archivo';
}

function isAllowedFile_(filename, mimeType) {
  const extension = (filename.match(/\.([^.]+)$/) || [])[1];
  const allowedExtensions = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'txt', 'rtf', 'csv',
    'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp', 'tif', 'tiff',
    'mp3', 'm4a', 'wav', 'ogg', 'oga', 'aac', 'flac', 'amr'
  ];
  return allowedExtensions.indexOf(String(extension || '').toLowerCase()) !== -1
    && /^(?:(?:application|text|image|audio)\/.*|)$/.test(mimeType);
}

function jsonForHtml_(value) {
  return JSON.stringify(value)
    .replace(/&/g, '\\u0026')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
