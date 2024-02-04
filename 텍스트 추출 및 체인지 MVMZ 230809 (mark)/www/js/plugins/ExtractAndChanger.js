//
// ExtractAndChanger.js
//

/*:ko
 * @plugindesc 대사를 추출하거나 바꾸는 툴.
 * @author whoami
 *
 * @help 먼저 추출할 게임의 data 와 js 폴더를 추출기의 Project 폴더에 복사한다.
 * EC extract : 대사를 추출
 * EC change : ExtractedData 폴더의 내용으로 대사를 변경
 * EC change2 : Extract2 폴더의 내용으로 대사를 변경
 * EC split : ExtractedData 를 Extract1 과 Extract2 로 나눔
 * EC combine : Extract1 과 Extract2 를 ExtractedData 로 합침
 *
 * @param isMark
 * @desc Mark모드와 LineNumber 모드를 변경한다.
 * Mark - true      LineNumber - false
 * Default: Mark
 * @default true
 *
 */
/*:en
 * @plugindesc Extract texts or change tool for MV.
 * @author whoami
 *
 * @help First, copy data and js folder of the game to extractor's Project folder.
 * EC extract : Extract texts
 * EC change : Change texts with ExtractedData folder
 * EC change2 : Change texts with Extract2 folder
 * EC split : Split ExtractedData to Extract1 and Extract2
 * EC combine : Combine Extract1 and Extract2 to ExtractedData
 *
 * @param isMark
 * @desc Change Mark mode and LineNumber mode.
 * Mark - true      LineNumber - false
 * Default: Mark
 * @default true
 *
 */

// load_data(strFilename)
// XP, VX, ACE 의 load_data 와 같은 일을 하는 함수
//
function load_data(strFilename)
{
	// from DataManager.loadDataFile()
	const path = load_data.path;
	const fs = load_data.fs;
	
	try {
	var xhr = new XMLHttpRequest();
	var url = path.join(ExtractAndChanger.strDataDir, strFilename);
	var ret = null;
	
	if (!fs.existsSync(url))
		throw(null);
	
	xhr.open('GET', url, false);
	xhr.overrideMimeType('application/json');
	xhr.send();
	
	if (xhr.status < 400)
		ret = JsonEx.parse(xhr.responseText);
	else
		throw("xhr.status = " + xhr.status);
	
	} catch (e) {
		if (e)
		{
			console.error("load_data: error: " + url);
			alert("load_data: error: " + url);
		}
		ret = null;
	}
	
	return ret;
};
load_data.path = require('path');
load_data.fs = require('fs');

// save_data(strFilename, jsonData)
// XP, VX, ACE 의 save_data 와 같은 일을 하는 함수
//
function save_data(strFilename, jsonData)
{
	// from StorageManager.saveToLocalFile()
	var path = require('path');
	var fs = require('fs');
	var filePath = path.join(ExtractAndChanger.strDataDir, strFilename);
	
    if (!fs.existsSync(filePath)) {
		console.error("save_data: error: " + filePath);
		alert("save_data: error: " + filePath);
		return false;
    }
	
	fs.writeFileSync(filePath, JsonEx.stringify(jsonData));
	
	return true;
};

// String.repaceAt
// 특정 위치의 문자를 변경하는 메소드
String.prototype.replaceAt=function(index, character) {
    return this.substr(0, index) + character + this.substr(index+character.length);
};

// ExtractAndChanger 객체
// - 명령 처리, 디렉토리 설정 등
//
function ExtractAndChanger()
{
	throw new Error('This is a static class');
};

ExtractAndChanger.isInit = false;
// 모드
ExtractAndChanger.isMark = true;
// 명령어
ExtractAndChanger.strCmd = 'EC';
// 디렉토리
ExtractAndChanger.strProjectDir = null;
ExtractAndChanger.strDataDir = null;
ExtractAndChanger.strScriptDir = null;
ExtractAndChanger.strExtract1Dir = null;
ExtractAndChanger.strExtract2Dir = null;
ExtractAndChanger.strExtractedDataDir = null;
ExtractAndChanger.strExtractedData_ScriptsDir = null;

ExtractAndChanger.logFile = null;

// 명령 처리기 콜백
ExtractAndChanger._Game_Interpreter_pluginCommand = null;
ExtractAndChanger.Execute = function(command, args)
{
	// 주의: 여기서는 this === Game_Interpreter 이므로 this.StrCmd 처럼 사용하면 에러

	ExtractAndChanger._Game_Interpreter_pluginCommand.call(this, command, args);
	if (command === ExtractAndChanger.strCmd)
	{
		switch(args[0]) {
			case 'extract':
				ExtractAndChanger.Extract();
				break;
			case 'change':
				ExtractAndChanger.Change(ExtractAndChanger.strExtractedDataDir);
				break;
			case 'change2':
				ExtractAndChanger.Change(ExtractAndChanger.strExtract2Dir);
				break;
			case 'combine':
				ExtractAndChanger.Combine();
				break;
			case 'split':
				ExtractAndChanger.Split();
				break;
			case 'test':
				ExtractAndChanger.Test();
				break;
			default:
				alert('ExtractAndChanger.Execute: unknown command: ' + args[0]);
		}
	}

};

ExtractAndChanger.Init = function(isMark)
{
	try 
	{
	ExtractAndChanger.isMark = isMark;
	
	var mode = (isMark)?"Mark mode":"Line number mode";
	
	console.log(this.name + ".Init: "+ mode);
	
	// 디렉토리 설정 (from StorageManager.localFileDirectoryPath)
	var path = require('path');
	var base = path.dirname(process.mainModule.filename);
	
	this.strProjectDir = path.join(base, 'Project/');
	this.strDataDir = path.join(this.strProjectDir, 'data/');
	this.strScriptDir = path.join(this.strProjectDir, 'js/');
	this.strExtract1Dir = path.join(base, 'Extract1/');
	this.strExtract2Dir = path.join(base, 'Extract2/');
	this.strExtractedDataDir = path.join(base, 'ExtractedData/');
	this.strExtractedData_ScriptsDir = path.join(base, 'ExtractedData_Scripts/');
	
	// Project/data 폴더가 없으면 생성
	var fs = require('fs');
	if (!fs.existsSync(this.strProjectDir))
		fs.mkdirSync(this.strProjectDir);
	if (!fs.existsSync(this.strDataDir))
		fs.mkdirSync(this.strDataDir);
	if (!fs.existsSync(this.strScriptDir))
		fs.mkdirSync(this.strScriptDir);
	
	// 작업폴더가 없으면 생성
	if (!fs.existsSync(this.strExtract1Dir))
		fs.mkdirSync(this.strExtract1Dir);
	if (!fs.existsSync(this.strExtract2Dir))
		fs.mkdirSync(this.strExtract2Dir);
	if (!fs.existsSync(this.strExtractedDataDir))
		fs.mkdirSync(this.strExtractedDataDir);
	if (!fs.existsSync(this.strExtractedData_ScriptsDir))
		fs.mkdirSync(this.strExtractedData_ScriptsDir);
	
	//var parameters = PluginManager.parameters(this.name);

	// 명령 처리기 콜백 등록
	this._Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
	Game_Interpreter.prototype.pluginCommand = this.Execute;
	
	ExtractAndChanger.isInit = true;
	console.log(this.name + ".Init: done");
	
	} catch (e) {
		console.error(this.name + ".init: error: " + e);
		ExtractAndChanger.isInit = false;
	}
	
};

ExtractAndChanger.Extract = function()
{
	// 파일이 있는지부터 테스트
	var path = require('path');
	var fs = require('fs');
	var file = path.join(this.strDataDir, "System.json");
	if (!fs.existsSync(file))
	{
		console.error("Project 폴더에 데이터가 없습니다");
		alert("Project 폴더에 데이터가 없습니다");
		return;
	}
	
	console.log("Extracting Database...");
	console.group();
	var worker = new DatabaseWorker();
	worker.Extract(this.strExtract1Dir);
	console.groupEnd();
	console.log("Done");
	
	console.log("Extracting CommonEvent...");
	console.group();
	worker = new CommonEventWorker();
	worker.Extract(this.strExtract1Dir);
	console.groupEnd();
	console.log("Done");
	
	console.log("Extracting Map...");
	console.group();
	worker = new MapWorker();
	worker.Extract(this.strExtract1Dir);
	console.groupEnd();
	console.log("Done");

	console.log("Extracting System...");
	console.group();
	worker = new SystemWorker();
	worker.Extract(this.strExtract1Dir);
	console.groupEnd();
	console.log("Done");

	console.log("Extracting Troops...");
	console.group();
	worker = new TroopsWorker();
	worker.Extract(this.strExtract1Dir);
	console.groupEnd();
	console.log("Done");

	var fs = require('fs');
	worker = new CopyWorker();
	// 스크립트 디렉토리가 존재?
	if (fs.existsSync(this.strScriptDir))
	{
		console.log("Copying scripts...");
		console.group();
		// MV에서 Scripts 는 그냥 복사
		worker.CopyAll(this.strScriptDir, this.strExtractedData_ScriptsDir);
		console.groupEnd();
		console.log("Done");
	}
	else
		console.log("Scripts directory is not found");
	
	// 작업폴더간 복사
	console.log("Copying extracted data to Extract2...");
	console.group();
	worker.CopyAll(this.strExtract1Dir, this.strExtract2Dir);
	console.groupEnd();
	console.log("Done");
	
	console.log("Copying extracted data to ExtractedData...");
	console.group();
	worker.Combine(this.strExtract1Dir, this.strExtract2Dir, this.strExtractedDataDir);
	console.groupEnd();
	console.log("Done");

	alert("추출이 완료되었습니다");
};
ExtractAndChanger.Change = function(strChangeDir)
{
	// 파일이 있는지부터 테스트
	var path = require('path');
	var fs = require('fs');
	var file = path.join(this.strDataDir, "System.json");
	if (!fs.existsSync(file))
	{
		console.error("Project 폴더에 데이터가 없습니다");
		alert("Project 폴더에 데이터가 없습니다");
		return;
	}
	var file = path.join(strChangeDir, "System.txt");
	if (!fs.existsSync(file))
	{
		console.error(strChangeDir + " 폴더에 데이터가 없습니다");
		alert(strChangeDir + " 폴더에 데이터가 없습니다");
		return;
	}

	console.log("Changing Database...");
	console.group();
	var worker = new DatabaseWorker();
	worker.Change(strChangeDir);
	console.groupEnd();
	console.log("Done");
	
	console.log("Changing CommonEvent...");
	console.group();
	worker = new CommonEventWorker();
	worker.Change(strChangeDir);
	console.groupEnd();
	console.log("Done");
	
	console.log("Changing Map...");
	console.group();
	worker = new MapWorker();
	worker.Change(strChangeDir);
	console.groupEnd();
	console.log("Done");
	
	console.log("Changing System...");
	console.group();
	worker = new SystemWorker();
	worker.Change(strChangeDir);
	console.groupEnd();
	console.log("Done");

	console.log("Changing Troops...");
	console.group();
	worker = new TroopsWorker();
	worker.Change(strChangeDir);
	console.groupEnd();
	console.log("Done");

	var fs = require('fs');
	worker = new CopyWorker();
	// 스크립트 디렉토리가 존재?
	if (fs.existsSync(this.strScriptDir))
	{
		console.log("Copying scripts...");
		console.group();
		// MV에서 Scripts 는 그냥 복사
		worker.CopyAll(this.strExtractedData_ScriptsDir, this.strScriptDir);
		console.groupEnd();
		console.log("Done");
	}
	else
		console.log("Scripts directory is not found");

	
	alert("교체가 완료되었습니다");
};
ExtractAndChanger.Combine = function()
{
	var worker = new CopyWorker();
	console.log("Combining Extract1 and Extract2 to ExtractedData...");
	console.group();
	worker.Combine(this.strExtract1Dir, this.strExtract2Dir, this.strExtractedDataDir);
	console.groupEnd();
	console.log("Done");
	
	alert("합치기가 완료되었습니다");
};
ExtractAndChanger.Split = function()
{
	var worker = new CopyWorker();
	console.log("Spliting ExtractedData to Extract1 and Extract2...");
	console.group();
	worker.Split(this.strExtractedDataDir, this.strExtract1Dir, this.strExtract2Dir);
	console.groupEnd();
	console.log("Done");
	
	alert("분리가 완료되었습니다");
}

ExtractAndChanger.Test = function()
{
	console.log("ExtractAndChanger.Test");
	
	console.log($dataSystem.gameTitle);
	console.log("RPGMaker version : " + Utils.RPGMAKER_VERSION);
	console.log(process.versions);
	//console.log(process.env);

};

// DataFile 객체
// - 데이터 파일 읽기, 쓰기 등
//
function DataFile()
{
	this.strFilePath = null;
	this.fd = null;
	this.arrLines = null;
	this.nNextLine = -1;
};

DataFile.prototype.fs = require('fs');
DataFile.prototype.path = require('path');

DataFile.prototype.OpenAsRead = function(strFilePath)
{
	
	if (this.strFilePath)
		this.Close();
	
	const fs = this.fs;
	
	try {
	
	this.arrLines = fs.readFileSync(strFilePath).toString().split("\n");
	
	for(var i=0; i < this.arrLines[0].length; i++)
		if (this.arrLines[0][i] == '#') break;	// find first '#'
	
	if (i)
		this.arrLines[0] = this.arrLines[0].substring(i);
	
	this.strFilePath = strFilePath;
	this.nNextLine = 0;
	
	} catch(e) {
		this.Close();
		console.error("DataFile.OpenAsRead: error: " + e);
		alert("DataFile.OpenAsRead: error: " + e);
		return false;
	}
	return true;
};

DataFile.prototype.OpenAsWrite = function(strFilePath)
{
	
	if (this.strFilePath)
		this.Close();
	
	const fs = this.fs;
	
	try {
	
	var fd = fs.openSync(strFilePath, 'w');
	
	if (!fd)
		throw(strFilePath);
	
	this.strFilePath = strFilePath;
	this.fd = fd;
	
	fs.writeSync(fd, String('\uFEFF'));
	
	} catch(e) {
		this.Close();
		console.error("DataFile.OpenAsWrite: error: " + e);
		alert("DataFile.OpenAsWrite: error: " + e);
		return false;
	}
	return true;
};

DataFile.prototype.Close = function()
{
	const fs = this.fs;
	if (this.fd)
		fs.closeSync(this.fd);
	
	this.fd = null;
	this.strFilePath = null;
	this.arrLines = null;
	this.nNextLine = -1;
};
DataFile.prototype.IsEOF = function()
{
	if (!this.CheckOpen("IsEOF")) return true;
	if (this.arrLines == null) return true;
	if (this.nNextLine >= this.arrLines.length) return true;
	return false;
};

DataFile.prototype.gets = function ()
{
	if (!this.CheckOpen("gets")) return '';
	
	var data = this.arrLines[this.nNextLine];
	
	if (typeof data === 'undefined')
		data = '';
	else
		this.nNextLine++;
	
	return data;
};

DataFile.prototype.puts = function (data)
{
	if (!this.CheckOpen("puts")) return;
	
	if (!data)
		return false;
	
	const fs = this.fs;
	data = data + '\n';
	fs.writeSync(this.fd, data);
	return true;
};

DataFile.prototype.get_data = function (dt, tf)
{
	const fs = this.fs;
	// 파일이 열려있지 않은 경우
	if (!this.CheckOpen("get_data")) return '';
	
	// 파일이 읽혀지지 않은 경우
	if (this.arrLines === null)
		return '';
	
	// 기본값 설정
	tf = (typeof tf !== 'undefined') ?  tf : false;
	
	if (tf)
	{
		if (dt == '' || !dt)
			return '';
	}
	
	var data = '';
	
	do
	{
		data = this.gets();
		
		// 주석이 아닌가?
		if (data.substring(0,2) != "#=")
		{
			// Mark 버전에 따라
			if (ExtractAndChanger.isMark)
			{
				// 원문이면 pass
				if (data[0] == '0')
					continue;
				// data 는 index 2부터
				data = data.substring(2);
			}
			else
			{
				var isOriginal = true;
				
				// 기본 line number 가 5자리이기 때문에 i는 5부터 시작
				for (var i = 5; i < data.length; i++)
				{
					if (data[i] == '>')
					{
						// 원문
						isOriginal = true;
						break;
					}
					else if (data[i] == ':')
					{
						// 번역문
						// data는 index + 1 부터
						data = data.substring(i+1);
						isOriginal = false;
						break;
					}
				}
				// 원문이면 pass
				if (isOriginal)
					continue;
			}
			break;
		}
	} while (!this.IsEOF())
	
	if (data[data.length-1] == '\r')
	{
		data = data.substring(0, data.length-1);
	}
	
	// escape 원복
	data = data.replace(/%&%/g, "\\");
	data = data.replace(/%!%/g, "\r");
	data = data.replace(/%@%/g, "\n");
	if (data == "&&&")
		data = '';
	
	return data;
};

DataFile.prototype.set_data = function(data, tf)
{
	if (!this.CheckOpen("put_set_data")) return;

	// 기본값 설정
	tf = (typeof tf !== 'undefined') ?  tf : false;

	if (!data)
		data = '';

	if (tf)
	{
		if (data == '')
			return '';
	}

	if (!isNaN(data))
		data = data.toString();
	
/*	if (data[data.length-1] == '\r')
	{
		data = data.substring(0, data.length-1);
	}*/

	// escape
	data = data.replace(/\\/g, "%&%");
	data = data.replace(/\r/g, "%!%");
	data = data.replace(/\n/g, "%@%");
	if (data == '')
		data = "&&&";
	
	if (this.nNextLine < 0)
		this.nNextLine = 0;
	
	var strLineNum;
	
	if (ExtractAndChanger.isMark)
		strLineNum = "1:";
	else
		strLineNum = "%1:".format((this.nNextLine+1).padZero(5));
	
	data = strLineNum + data;
	
	if (this.puts(data))
		this.nNextLine++;
};

DataFile.prototype.CheckOpen = function(strNameFunc)
{
	if (!this.strFilePath)
	{
		console.error("DataFile." + strNameFunc + ": File is not opened");
		return false;
	}
	return true;
}

DataFile.prototype.remove_special_char = function(str)
{
	str = str.replace(/\r/g, "");
	str = str.replace(/\n/g, "");
	return str;
}

DataFile.prototype.put_start_block = function()
{
	if (!this.CheckOpen("put_start_block")) return;
	
	this.puts("#===== ExtractAndChanger version: " + $dataSystem.gameTitle.slice(-6));
	
	for(var i=0; i<6; i++)
		this.puts("#=====");
};

DataFile.prototype.put_end_block = function()
{
	if (!this.CheckOpen("put_end_block")) return;
	
	this.puts("#=====");
	this.puts("#=====");
	this.puts("#================= End of File");
	this.puts("#=====");

};

DataFile.prototype.put_title_block = function(strTitle)
{
	if (!this.CheckOpen("put_title_block")) return;

	strTitle = this.remove_special_char(strTitle);
	this.puts("#====================================================================");
	this.puts("#=   " + strTitle);
	this.puts("#====================================================================");
};

DataFile.prototype.put_short_title_block = function(strTitle)
{
	if (!this.CheckOpen("put_short_title_block")) return;
	strTitle = this.remove_special_char(strTitle);
	this.puts("#======================= " + strTitle);
};

DataFile.prototype.put_id_name_block = function(id, strName, is4digit)
{
	if (!this.CheckOpen("put_id_name_block")) return;
	
	var strID;
	if (is4digit)
		strID = id.padZero(4);
	else
		strID = id.padZero(3);
	strName = this.remove_special_char(strName);
	//this.puts("#===== ID:" + strID + "   , Name:" + strName);
	this.puts("#======================= ID: " + strID + "   , Name: " + strName);
};

DataFile.prototype.put_type_id_name_block = function(type, id, strName, is4digit)
{
	if (!this.CheckOpen("put_type_id_name_block")) return;
	
	var strID;
	if (is4digit)
		strID = id.padZero(4);
	else
		strID = id.padZero(3);
	strName = this.remove_special_char(strName);
	this.puts("#=====  " + type + " ID: " + strID + "   , Name: " + strName);
};

DataFile.prototype.put_plugin_name_command_block = function(strName, strCommand)
{
	if (!this.CheckOpen("put_plugin_name_command_block")) return;
	strName = this.remove_special_char(strName);
	strCommand = this.remove_special_char(strCommand);
	this.puts("#=====-----  Plugin (MZ) Name: " + strName + "   , Command: " + strCommand);
};

DataFile.prototype.put_argument_block = function(strArgName)
{
	if (!this.CheckOpen("put_argument_block")) return;
	strArgName = this.remove_special_char(strArgName);
	this.puts("#=====  args[\"" + strArgName+"\"]=");
};

DataFile.prototype.put_line = function()
{
	if (!this.CheckOpen("put_line")) return;
	this.puts("#====================================================================");
};
DataFile.prototype.put_short_line = function()
{
	if (!this.CheckOpen("put_short_line")) return;
	this.puts("#===================================");
};
DataFile.prototype.put_thin_line = function()
{
	if (!this.CheckOpen("put_thin_line")) return;
	this.puts("#=====---------------------------------------------------------------");
};
DataFile.prototype.put_map_block = function(map_id, map_name)
{
	map_name = this.remove_special_char(map_name);
	this.put_line();
	this.put_type_id_name_block("Map", map_id, map_name);
	this.put_line();
}

DataFile.prototype.put_event_block = function(event_id, event_name)
{
	event_name = this.remove_special_char(event_name);
	this.put_thin_line();
	this.put_type_id_name_block("Event", event_id, event_name);
	this.put_thin_line();
}
DataFile.prototype.put_troop_block = function(troop_id, event_name)
{
	event_name = this.remove_special_char(event_name);
	this.put_thin_line();
	this.put_type_id_name_block("Troop", troop_id, event_name);
	this.put_thin_line();
}
DataFile.prototype.put_page_block = function(page)
{
	if (!this.CheckOpen("put_page_block")) return;
	this.puts("#= <<< " + page + " Page >>>");
};
DataFile.prototype.warn = function(warning)
{
	if (!this.CheckOpen("warn")) return;
	this.puts("#= ### WARNING: " + warning + " ###");
	console.warn(warning);
};

// DatabaseWorker 객체
// - 데이터베이스 추출 및 삽입
//
function DatabaseWorker()
{
	this.dataFile = new DataFile();	
};

// DatabaseWorker.put_(something)_block
//
DatabaseWorker.prototype.put_actor_block = function()
{
	this.dataFile.put_title_block("Actor Data");
};
DatabaseWorker.prototype.put_class_block = function()
{
	this.dataFile.put_title_block("Job Data");
};
DatabaseWorker.prototype.put_skill_block = function()
{
	this.dataFile.put_title_block("Skill Data");
};
DatabaseWorker.prototype.put_skill_message_block = function()
{
	this.dataFile.put_title_block("Skill-Message Data");
};
DatabaseWorker.prototype.put_item_block = function()
{
	this.dataFile.put_title_block("Item Data");
};
DatabaseWorker.prototype.put_weapon_block = function()
{
	this.dataFile.put_title_block("Weapon Data");
};
DatabaseWorker.prototype.put_armor_block = function()
{
	this.dataFile.put_title_block("Armor Data");
};
DatabaseWorker.prototype.put_enemy_block = function()
{
	this.dataFile.put_title_block("Enemy Data");
};
DatabaseWorker.prototype.put_state_block = function()
{
	this.dataFile.put_title_block("State Data");
};
DatabaseWorker.prototype.put_state_message_block = function()
{
	this.dataFile.put_title_block("State-Message Data");
};
DatabaseWorker.prototype.put_animation_block = function()
{
	this.dataFile.put_title_block("Animation Data");
};
DatabaseWorker.prototype.put_tileset_block = function()
{
	this.dataFile.put_title_block("Tileset Data");
};
DatabaseWorker.prototype.put_baseid_block = function(id, name)
{
	this.dataFile.put_id_name_block(id, name);
};

// DatabaseWorker.Extract 계열
//
DatabaseWorker.prototype.ExtractActor = function(strJSONFilename)
{
	this.put_actor_block();
	var actor = load_data(strJSONFilename);
	
	const dataFile = this.dataFile;
	for(var i in actor)
	{
		if (i == 0) continue;
		this.put_baseid_block(actor[i].id, actor[i].name);
		dataFile.set_data(actor[i].name, true);
		dataFile.set_data(actor[i].nickname, true);
		if (actor[i].profile !== undefined && actor[i].profile !== null)
		{
			dec = actor[i].profile.split("\n");
			dec.forEach(function(data) {
				dataFile.set_data(data);
			});
		}
	}
};
DatabaseWorker.prototype.ExtractClass = function(strJSONFilename)
{
	this.put_class_block();
	var class_data = load_data(strJSONFilename);
	
	const dataFile = this.dataFile;
	for(var i in class_data)
	{
		if (i == 0) continue;
		
		this.put_baseid_block(class_data[i].id, class_data[i].name);
		dataFile.set_data(class_data[i].name, true);
	}
};
DatabaseWorker.prototype.ExtractSkill = function(strJSONFilename)
{
	this.put_skill_block();
	var skill = load_data(strJSONFilename);
	
	const dataFile = this.dataFile;
	for(var i in skill)
	{
		if (i == 0) continue;
		
		this.put_baseid_block(skill[i].id, skill[i].name);
		dataFile.set_data(skill[i].name, true);
		if (skill[i].description !== undefined && skill[i].description !== null)
		{
			dec = skill[i].description.split("\n");
			dec.forEach(function(data) {
				dataFile.set_data(data);
			});
		}
	}
};
DatabaseWorker.prototype.ExtractSkillMessage = function(strJSONFilename)
{
	this.put_skill_message_block();
	var skill = load_data(strJSONFilename);
	
	const dataFile = this.dataFile;
	for(var i in skill)
	{
		if (i == 0) continue;
		
		this.put_baseid_block(skill[i].id, skill[i].name);
		dataFile.set_data(skill[i].message1, true);
		dataFile.set_data(skill[i].message2, true);
	}
};
DatabaseWorker.prototype.ExtractItem = function(strJSONFilename)
{
	this.put_item_block();
	var item = load_data(strJSONFilename);
	
	const dataFile = this.dataFile;
	for(var i in item)
	{
		if (i == 0) continue;
		
		this.put_baseid_block(item[i].id, item[i].name);
		dataFile.set_data(item[i].name, true);
		if (item[i].description !== undefined && item[i].description !== null)
		{
			dec = item[i].description.split("\n");
			dec.forEach(function(data) {
				dataFile.set_data(data);
			});
		}
	}
};
DatabaseWorker.prototype.ExtractWeapon = function(strJSONFilename)
{
	this.put_weapon_block();
	var weapon = load_data(strJSONFilename);
	
	const dataFile = this.dataFile;
	for(var i in weapon)
	{
		if (i == 0) continue;
		
		this.put_baseid_block(weapon[i].id, weapon[i].name);
		dataFile.set_data(weapon[i].name, true);
		if (weapon[i].description !== undefined && weapon[i].description !== null)
		{
			dec = weapon[i].description.split("\n");
			dec.forEach(function(data) {
				dataFile.set_data(data);
			});
		}
	}
};
DatabaseWorker.prototype.ExtractArmor = function(strJSONFilename)
{
	this.put_armor_block();
	var armor = load_data(strJSONFilename);
	
	const dataFile = this.dataFile;
	for(var i in armor)
	{
		if (i == 0) continue;
		
		this.put_baseid_block(armor[i].id, armor[i].name);
		dataFile.set_data(armor[i].name, true);
		if (armor[i].description !== undefined && armor[i].description !== null)
		{
			dec = armor[i].description.split("\n");
			dec.forEach(function(data) {
				dataFile.set_data(data);
			});
		}
	}
};
DatabaseWorker.prototype.ExtractEnemy = function(strJSONFilename)
{
	this.put_enemy_block();
	var enemy = load_data(strJSONFilename);
	
	const dataFile = this.dataFile;
	for(var i in enemy)
	{
		if (i == 0) continue;
		
		this.put_baseid_block(enemy[i].id, enemy[i].name);
		dataFile.set_data(enemy[i].name, true);
	}
};
DatabaseWorker.prototype.ExtractState = function(strJSONFilename)
{
	this.put_state_block();
	var state = load_data(strJSONFilename);
	
	const dataFile = this.dataFile;
	for(var i in state)
	{
		if (i == 0) continue;
		
		this.put_baseid_block(state[i].id, state[i].name);
		dataFile.set_data(state[i].name, true);
	}
};
DatabaseWorker.prototype.ExtractStateMessage = function(strJSONFilename)
{
	this.put_state_message_block();
	var state = load_data(strJSONFilename);
	
	const dataFile = this.dataFile;
	for(var i in state)
	{
		if (i == 0) continue;
		
		this.put_baseid_block(state[i].id, state[i].name);
		dataFile.set_data(state[i].message1, true);
		dataFile.set_data(state[i].message2, true);
		dataFile.set_data(state[i].message3, true);
		dataFile.set_data(state[i].message4, true);
	}
};
DatabaseWorker.prototype.ExtractAnimation = function(strJSONFilename)
{
	this.put_animation_block();
	var animation = load_data(strJSONFilename);
	
	const dataFile = this.dataFile;
	for(var i in animation)
	{
		if (i == 0) continue;
		
		this.put_baseid_block(animation[i].id, animation[i].name);
		dataFile.set_data(animation[i].name, true);
	}
};
DatabaseWorker.prototype.ExtractTileset = function(strJSONFilename)
{
	this.put_tileset_block();
	var tileset = load_data(strJSONFilename);
	
	const dataFile = this.dataFile;
	for(var i in tileset)
	{
		if (i == 0) continue;
		
		this.put_baseid_block(tileset[i].id, tileset[i].name);
		dataFile.set_data(tileset[i].name, true);
	}
};
DatabaseWorker.prototype.ExtractMemo = function()
{
	var arrJSONFiles = [
		"Actors.json",		// #0
		"Classes.json",		// #1
		"Skills.json",		// #2
		"Items.json",		// #3
		"Weapons.json",		// #4
		"Armors.json",		// #5
		"Enemies.json",		// #6
		"States.json"		// #7
//		,"Tilesets.json"		// #8	not used
		];
	
	var arrDataNames = [
		"Actor",		// #0
		"Class",		// #1
		"Skill",		// #2
		"Item",			// #3
		"Weapon",		// #4
		"Armor",		// #5
		"Enemy",		// #6
		"State",		// #7
		"Tileset"		// #8
		];
	const dataFile = this.dataFile;
	
	for (var i in arrJSONFiles)
	{
		dataFile.put_title_block(arrDataNames[i] + "'s Memos");
		
		var database = load_data(arrJSONFiles[i]);
		for (var j in database)
		{
			if (j == 0) continue;
			var id = database[j].id;
			var name = database[j].name;
			var dec = database[j].note.split("\n");
			
			dataFile.put_type_id_name_block(arrDataNames[i], id, name);
			
			dec.forEach(function(data) {
				dataFile.set_data(data, true);
			});
		}
	}
}
// DatabaseWorker.Extract
// - 메인 Extract 함수
DatabaseWorker.prototype.Extract = function(strExtractDir)
{
	var path = require('path');
	
	// Database.txt
	this.dataFile.OpenAsWrite(path.join(strExtractDir, "Database.txt"));
	this.dataFile.put_start_block();
	
	this.ExtractActor("Actors.json");
	this.ExtractClass("Classes.json");
	this.ExtractSkill("Skills.json");
	this.ExtractSkillMessage("Skills.json");
	this.ExtractItem("Items.json");
	this.ExtractWeapon("Weapons.json");
	this.ExtractArmor("Armors.json");
	this.ExtractEnemy("Enemies.json");
	this.ExtractState("States.json");
	this.ExtractStateMessage("States.json");
	
	this.dataFile.put_end_block();
	this.dataFile.Close();

	// Database_Memo.txt
	this.dataFile.OpenAsWrite(path.join(strExtractDir, "Database_Memo.txt"));
	this.dataFile.put_start_block();
	
	this.ExtractMemo();
	
	this.dataFile.put_end_block();
	this.dataFile.Close();
};

// DatabaseWorker.Change 계열
//
DatabaseWorker.prototype.ChangeActor = function(strJSONFilename)
{
	var actor = load_data(strJSONFilename);
	
	var changed = '';
	
	const dataFile = this.dataFile;
	for(var i in actor)
	{
		if (i == 0) continue;
		
		changed = dataFile.get_data(actor[i].name, true);
		actor[i].name = changed;
		changed = dataFile.get_data(actor[i].nickname, true);
		actor[i].nickname = changed;
		
		changed = '';
		if (actor[i].profile !== undefined && actor[i].profile !== null)
		{
			dec = actor[i].profile.split("\n");
			dec.forEach(function(data) {
				if (changed.length > 0)
					changed += "\n";
				changed += dataFile.get_data();
			});
			actor[i].profile = changed;
		}
	}
	save_data(strJSONFilename, actor);
};
DatabaseWorker.prototype.ChangeClass = function(strJSONFilename)
{
	var class_data = load_data(strJSONFilename);
	
	var changed = '';
	
	const dataFile = this.dataFile;
	for(var i in class_data)
	{
		if (i == 0) continue;
		
		changed = dataFile.get_data(class_data[i].name, true);
		class_data[i].name = changed;
	}
	save_data(strJSONFilename, class_data);
};
DatabaseWorker.prototype.ChangeSkill = function(strJSONFilename)
{
	var skill = load_data(strJSONFilename);
	
	var changed = '';
	
	const dataFile = this.dataFile;
	for(var i in skill)
	{
		if (i == 0) continue;
		
		changed = dataFile.get_data(skill[i].name, true);
		skill[i].name = changed;
		
		changed = '';
		if (skill[i].description !== undefined && skill[i].description !== null)
		{
			dec = skill[i].description.split("\n");
			dec.forEach(function(data) {
				if (changed.length > 0)
					changed += "\n";
				changed += dataFile.get_data();
			});
			skill[i].description = changed;
		}
	}
	save_data(strJSONFilename, skill);
};
DatabaseWorker.prototype.ChangeSkillMessage = function(strJSONFilename)
{
	var skill = load_data(strJSONFilename);
	
	var changed = '';
	
	const dataFile = this.dataFile;
	for(var i in skill)
	{
		if (i == 0) continue;
		
		changed = dataFile.get_data(skill[i].message1, true);
		skill[i].message1 = changed;
		changed = dataFile.get_data(skill[i].message2, true);
		skill[i].message2 = changed;
	}
	save_data(strJSONFilename, skill);
};
DatabaseWorker.prototype.ChangeItem = function(strJSONFilename)
{
	var item = load_data(strJSONFilename);
	
	var changed = '';
	
	const dataFile = this.dataFile;
	for(var i in item)
	{
		if (i == 0) continue;
		
		changed = dataFile.get_data(item[i].name, true);
		item[i].name = changed;
		
		changed = '';
		if (item[i].description !== undefined && item[i].description !== null)
		{
			dec = item[i].description.split("\n");
			dec.forEach(function(data) {
				if (changed.length > 0)
					changed += "\n";
				changed += dataFile.get_data();
			});
			item[i].description = changed;
		}
	}
	save_data(strJSONFilename, item);
};
DatabaseWorker.prototype.ChangeWeapon = function(strJSONFilename)
{
	var weapon = load_data(strJSONFilename);
	
	var changed = '';
	
	const dataFile = this.dataFile;
	for(var i in weapon)
	{
		if (i == 0) continue;
		
		changed = dataFile.get_data(weapon[i].name, true);
		weapon[i].name = changed;
		
		changed = '';
		if (weapon[i].description !== undefined && weapon[i].description !== null)
		{
			dec = weapon[i].description.split("\n");
			dec.forEach(function(data) {
				if (changed.length > 0)
					changed += "\n";
				changed += dataFile.get_data();
			});
			weapon[i].description = changed;
		}
	}
	save_data(strJSONFilename, weapon);
};
DatabaseWorker.prototype.ChangeArmor = function(strJSONFilename)
{
	var armor = load_data(strJSONFilename);
	
	var changed = '';
	
	const dataFile = this.dataFile;
	for(var i in armor)
	{
		if (i == 0) continue;
		
		changed = dataFile.get_data(armor[i].name, true);
		armor[i].name = changed;
		
		changed = '';
		if (armor[i].description !== undefined && armor[i].description !== null)
		{
			dec = armor[i].description.split("\n");
			dec.forEach(function(data) {
				if (changed.length > 0)
					changed += "\n";
				changed += dataFile.get_data();
			});
			armor[i].description = changed;
		}
	}
	save_data(strJSONFilename, armor);
};
DatabaseWorker.prototype.ChangeEnemy = function(strJSONFilename)
{
	var enemy = load_data(strJSONFilename);
	
	var changed = '';
	
	const dataFile = this.dataFile;
	for(var i in enemy)
	{
		if (i == 0) continue;
		
		changed = dataFile.get_data(enemy[i].name, true);
		enemy[i].name = changed;
	}
	save_data(strJSONFilename, enemy);
};
DatabaseWorker.prototype.ChangeState = function(strJSONFilename)
{
	var state = load_data(strJSONFilename);
	
	var changed = '';
	
	const dataFile = this.dataFile;
	for(var i in state)
	{
		if (i == 0) continue;
		
		changed = dataFile.get_data(state[i].name, true);
		state[i].name = changed;
	}
	save_data(strJSONFilename, state);
};
DatabaseWorker.prototype.ChangeStateMessage = function(strJSONFilename)
{
	var state = load_data(strJSONFilename);
	
	var changed = '';
	
	const dataFile = this.dataFile;
	for(var i in state)
	{
		if (i == 0) continue;
		
		changed = dataFile.get_data(state[i].message1, true);
		state[i].message1 = changed;
		changed = dataFile.get_data(state[i].message2, true);
		state[i].message2 = changed;
		changed = dataFile.get_data(state[i].message3, true);
		state[i].message3 = changed;
		changed = dataFile.get_data(state[i].message4, true);
		state[i].message4 = changed;
	}
	save_data(strJSONFilename, state);
};
DatabaseWorker.prototype.ChangeAnimation = function(strJSONFilename)
{
	var animation = load_data(strJSONFilename);
	
	var changed = '';
	
	const dataFile = this.dataFile;
	for(var i in animation)
	{
		if (i == 0) continue;
		
		changed = dataFile.get_data(animation[i].name, true);
		animation[i].name = changed;
	}
	save_data(strJSONFilename, animation);
};
DatabaseWorker.prototype.ChangeTileset = function(strJSONFilename)
{
	var tileset = load_data(strJSONFilename);
	
	var changed = '';
	
	const dataFile = this.dataFile;
	for(var i in tileset)
	{
		if (i == 0) continue;
		
		changed = dataFile.get_data(tileset[i].name, true);
		tileset[i].name = changed;
	}
	save_data(strJSONFilename, tileset);
};
DatabaseWorker.prototype.ChangeMemo = function()
{
	var arrJSONFiles = [
		"Actors.json",		// #0
		"Classes.json",		// #1
		"Skills.json",		// #2
		"Items.json",		// #3
		"Weapons.json",		// #4
		"Armors.json",		// #5
		"Enemies.json",		// #6
		"States.json"		// #7
//		,"Tilesets.json"		// #8	not used
		];
	
	var arrDataNames = [
		"Actor",		// #0
		"Class",		// #1
		"Skill",		// #2
		"Item",			// #3
		"Weapon",		// #4
		"Armor",		// #5
		"Enemy",		// #6
		"State",		// #7
		"Tileset"		// #8
		];
	const dataFile = this.dataFile;
	
	var changed = ''
	for (var i in arrJSONFiles)
	{
		var database = load_data(arrJSONFiles[i]);
		for (var j in database)
		{
			if (j == 0) continue;
			var dec = database[j].note.split("\n");
			changed = '';
			dec.forEach(function(data) {
				if (changed.length > 0)
					changed += "\n";
				changed += dataFile.get_data(data, true);
			});
			database[j].note = changed;
		}
		save_data(arrJSONFiles[i], database);
	}
}
// DatabaseWorker.Change
// - 메인 Change 함수
DatabaseWorker.prototype.Change = function(strChangeDir)
{
	var path = require('path');
	
	try {
	// Database.txt

	if (!this.dataFile.OpenAsRead(path.join(strChangeDir, "Database.txt")))
		throw("OpenAsRead error:" + "Database.txt");
	
	this.ChangeActor("Actors.json");
	this.ChangeClass("Classes.json");
	this.ChangeSkill("Skills.json");
	this.ChangeSkillMessage("Skills.json");
	this.ChangeItem("Items.json");
	this.ChangeWeapon("Weapons.json");
	this.ChangeArmor("Armors.json");
	this.ChangeEnemy("Enemies.json");
	this.ChangeState("States.json");
	this.ChangeStateMessage("States.json");
	
	this.dataFile.Close();
	
	// Database_Memo.txt

	if (!this.dataFile.OpenAsRead(path.join(strChangeDir, "Database_Memo.txt")))
		throw("OpenAsRead error:" + "Database_Memo.txt");
	
	this.ChangeMemo();
	
	this.dataFile.Close();

	} catch (e) {
		this.dataFile.Close();
		console.error("DatabaseWorker.Change: error: " + e);
		throw(e);
	}
};

// EventWorker 객체
// - CommonEvent, MapEvent, TroopEvent 의 공통된 부분을 처리
//
function EventWorker(dlgFile, desFile, scriptFile, cmtFile, varFile, charFile)
{
	this.dlgFile = dlgFile;	// Dialog
	this.desFile = desFile;	// Designation
	this.scriptFile = scriptFile;	// Script
	this.cmtFile = cmtFile;	// Comment
	this.varFile = varFile;	// Script in variables
	this.charFile = charFile;	// Character name
	
	this.dataVar = null;	// Variable data
	this.dataChar = null;	// Character data
	
	this.dlg_mapID = 0;
	this.des_mapID = 0;
	this.script_mapID = 0;
	this.cmt_mapID = 0;
	this.var_mapID = 0;
	this.char_mapID = 0;
};

EventWorker.prototype.ExtractEvent = function(arrCommandList, id, name, cmt_event_put, page, mapID, mapName, cmt_map_put)
{
	var isTroop = false;
	
	var dlg_event_put = false;
	var dlg_page_put = false;
	
	var des_event_put = false;
	var des_page_put = false;
	var des_block_put = false;
	
	var script_event_put = false;
	var script_page_put = false;
	
	if (!cmt_event_put)
		cmt_event_put = false;
		
	var cmt_page_put = false;
	
	var var_event_put = false;
	var var_page_put = false;
	var var_block_put = false;
	
	var char_event_put = false;
	var char_page_put = false;
	
	var des_id = -1;
	var var_id = -1;
	
	const dlgFile = this.dlgFile;
	const desFile = this.desFile;
	const scriptFile = this.scriptFile;
	const cmtFile = this.cmtFile;
	const varFile = this.varFile;
	const charFile = this.charFile;
	
	if (page && !mapID)
		isTroop = true;
	
	if (this.dataVar == null)
		this.dataVar = load_data("System.json");
	const dataVar = this.dataVar;
	
	if (this.dataChar == null)
		this.dataChar = load_data("Actors.json");
	const dataChar = this.dataChar;
	
	arrCommandList.forEach(function(command) {
		switch(command.code)
		{
			case 101:
			case 401:	// text data
			case 405:	// scrolling text data
				if (mapID && (this.dlg_mapID != mapID))
				{
					this.dlg_mapID = mapID;
					dlgFile.put_map_block(mapID, mapName);
					dlg_map_put = true;
				}
				if (!dlg_event_put)
				{
					if (isTroop)
						dlgFile.put_troop_block(id, name);
					else
						dlgFile.put_event_block(id, name);
					dlg_event_put = true;
				}
				if (page && !dlg_page_put)
				{
					dlgFile.put_page_block(page);
					dlg_page_put = true;
				}
				dlgFile.set_data(command.parameters[0]);
				// MZ: params[4] 101 only?
				if (command.parameters[4] !== undefined)
					dlgFile.set_data(command.parameters[4]);
				break;
			case 102:	// show choices
				if (mapID && (this.dlg_mapID != mapID))
				{
					this.dlg_mapID = mapID;
					dlgFile.put_map_block(mapID, mapName);
					dlg_map_put = true;
				}
				if (!dlg_event_put)
				{
					if (isTroop)
						dlgFile.put_troop_block(id, name);
					else
						dlgFile.put_event_block(id, name);
					dlg_event_put = true;
				}
				if (page && !dlg_page_put)
				{
					dlgFile.put_page_block(page);
					dlg_page_put = true;
				}
				for (var j in command.parameters[0])
				{
					dlgFile.set_data(command.parameters[0][j]);
				}
				break;
				
			case 324:	// Designation (nickname)
				if (mapID && (this.des_mapID != mapID))
				{
					this.des_mapID = mapID;
					desFile.put_map_block(mapID, mapName);
					des_map_put = true;
				}
				if (!des_event_put)
				{
					if (isTroop)
						desFile.put_troop_block(id, name);
					else
						desFile.put_event_block(id, name);
					des_event_put = true;
				}
				if (page && !des_page_put)
				{
					desFile.put_page_block(page);
					des_page_put = true;
				}
				if ( (des_id != command.parameters[0]) || (des_block_put == false) )
				{
					des_id = command.parameters[0];
					desFile.put_type_id_name_block("Char", des_id, dataChar[des_id].name);
					des_block_put = true;
				}
				else
				{
					des_id = -1;
					des_block_put = false;
				}
				desFile.put_short_title_block("Nickname");
				desFile.set_data(command.parameters[1]);
				break;
				
			case 355:
			case 655:	// scripts
				if (mapID && (this.script_mapID != mapID))
				{
					this.script_mapID = mapID;
					scriptFile.put_map_block(mapID, mapName);
					script_map_put = true;
				}
				if (!script_event_put)
				{
					if (isTroop)
						scriptFile.put_troop_block(id, name);
					else
						scriptFile.put_event_block(id, name);

					script_event_put = true;
				}
				if (command.code == 355)
					scriptFile.put_short_line();
				if (page && !script_page_put)
				{
					scriptFile.put_page_block(page);
					script_page_put = true;
				}
				scriptFile.set_data(command.parameters[0]);
				break;
				
			case 356:	// plugin command
				if (mapID && (this.script_mapID != mapID))
				{
					this.script_mapID = mapID;
					scriptFile.put_map_block(mapID, mapName);
					script_map_put = true;
				}
				if (!script_event_put)
				{
					if (isTroop)
						scriptFile.put_troop_block(id, name);
					else
						scriptFile.put_event_block(id, name);

					script_event_put = true;
				}
				scriptFile.put_short_line();
				if (page && !script_page_put)
				{
					scriptFile.put_page_block(page);
					script_page_put = true;
				}
				scriptFile.put_short_title_block("Plugin command");
				scriptFile.set_data(command.parameters[0]);
				break;
				
			case 357:	// plugin command (MZ)
				if (mapID && (this.script_mapID != mapID))
				{
					this.script_mapID = mapID;
					scriptFile.put_map_block(mapID, mapName);
					script_map_put = true;
				}
				if (!script_event_put)
				{
					if (isTroop)
						scriptFile.put_troop_block(id, name);
					else
						scriptFile.put_event_block(id, name);

					script_event_put = true;
				}
				scriptFile.put_short_line();
				if (page && !script_page_put)
				{
					scriptFile.put_page_block(page);
					script_page_put = true;
				}

				scriptFile.put_plugin_name_command_block(command.parameters[0],command.parameters[1]);

				if (command.parameters[3])
				{
					for (var key in command.parameters[3])
					{
						scriptFile.put_argument_block(key);
						scriptFile.set_data(command.parameters[3][key], true);
					}
				}
				break;
			
			case 108:
			case 408:	// comment
				if (mapID && (this.cmt_mapID != mapID))
				{
					this.cmt_mapID = mapID;
					if (!cmt_map_put)
						cmtFile.put_map_block(mapID, mapName);
					cmt_map_put = true;
				}
				if (!cmt_event_put)
				{
					if (isTroop)
						cmtFile.put_troop_block(id, name);
					else
						cmtFile.put_event_block(id, name);
					cmt_event_put = true;
				}
				if (command.code == 108)
					cmtFile.put_short_line();
				if (page && !cmt_page_put)
				{
					cmtFile.put_page_block(page);
					cmt_page_put = true;
				}
				cmtFile.set_data(command.parameters[0]);
			
				break;
			
			case 122:	// variable
				if (command.parameters[3] == 4)	// script variable
				{
					if (mapID && (this.var_mapID != mapID))
					{
						this.var_mapID = mapID;
						varFile.put_map_block(mapID, mapName);
						var_map_put = true;
					}
					if (!var_event_put)
					{
						if (isTroop)
							varFile.put_troop_block(id, name);
						else
							varFile.put_event_block(id, name);
						var_event_put = true;
					}
					varFile.put_short_line();
					if (page && !var_page_put)
					{
						varFile.put_page_block(page);
						var_page_put = true;
					}
					if ( (var_id != command.parameters[0]) || (var_block_put == false) )
					{
						var_id = command.parameters[0];
						var_block_put = true;
						
						varFile.put_type_id_name_block("Var", var_id, dataVar.variables[var_id], true);
					}
					varFile.set_data(command.parameters[4]);
				}
				else
				{
					var_id = -1;
					var_block_put = false;
				}
				break;
				
			case 320:	// character name
				if (mapID && (this.char_mapID != mapID))
				{
					this.char_mapID = mapID;
					charFile.put_map_block(mapID, mapName);
					char_map_put = true;
				}
				if (!char_event_put)
				{
					if (isTroop)
						charFile.put_troop_block(id, name);
					else
						charFile.put_event_block(id, name);
					char_event_put = true;
				}
				if (page && !char_page_put)
				{
					charFile.put_page_block(page);
					char_page_put = true;
				}
				charFile.put_type_id_name_block("Char", dataChar[command.parameters[0]].id, dataChar[command.parameters[0]].name);
				charFile.set_data(command.parameters[1]);
				break;

			case 325:	// Designation (profile)
				if (mapID && (this.des_mapID != mapID))
				{
					this.des_mapID = mapID;
					desFile.put_map_block(mapID, mapName);
					des_map_put = true;
				}
				if (!des_event_put)
				{
					if (isTroop)
						desFile.put_troop_block(id, name);
					else
						desFile.put_event_block(id, name);
					des_event_put = true;
				}
				if (page && !des_page_put)
				{
					desFile.put_page_block(page);
					des_page_put = true;
				}
				if ( (des_id != command.parameters[0]) || (des_block_put == false) )
				{
					des_id = command.parameters[0];
					desFile.put_type_id_name_block("Char", des_id, dataChar[des_id].name);
					des_block_put = true;
				}
				else
				{
					des_id = -1;
					des_block_put = false;
				}
				desFile.put_short_title_block("Profile");
				
				var dec = command.parameters[1].split("\n");
				dec.forEach(function(data) {
					desFile.set_data(data);
				});
				break;

			default:;
		}
	});
};

EventWorker.prototype.ChangeEvent = function(arrCommandList)
{
	var change_dialog = '';
	var command_402 = [];
	
	const dlgFile = this.dlgFile;
	const desFile = this.desFile;
	const scriptFile = this.scriptFile;
	const cmtFile = this.cmtFile;
	const varFile = this.varFile;
	const charFile = this.charFile;
	
	if (this.dataChar == null)
		this.dataChar = load_data("Actors.json");
	const dataChar = this.dataChar;

	
	arrCommandList.forEach(function(command) {
		switch(command.code)
		{
			case 101:
			case 401:	// text data
			case 405:	// scrolling text data
				arrCommandList[arrCommandList.indexOf(command)].parameters[0] = dlgFile.get_data();
				// MZ: params[4] 101 only?
				if (arrCommandList[arrCommandList.indexOf(command)].parameters[4] !== undefined)
					arrCommandList[arrCommandList.indexOf(command)].parameters[4] = dlgFile.get_data();
				break;

				break;
			case 102:	// show choices
				for (var i in command.parameters[0])
				{
					change_dialog = dlgFile.get_data();
					if (typeof command_402[command.indent] === 'undefined')
						command_402[command.indent] = [];
					command_402[command.indent].push(change_dialog);
					arrCommandList[arrCommandList.indexOf(command)].parameters[0][i] = change_dialog;
				}
				break;
			case 402:	// when [**]
				arrCommandList[arrCommandList.indexOf(command)].parameters[1] = command_402[command.indent].shift();
				break;
				
			case 324:	// Designation (nickname)
				arrCommandList[arrCommandList.indexOf(command)].parameters[1] = desFile.get_data();
				break;
				
			case 355:
			case 655:	// scripts
			case 356:	// plugin command
				arrCommandList[arrCommandList.indexOf(command)].parameters[0] = scriptFile.get_data();
				break;
			case 357:	// plugin command (MZ)
				var param = arrCommandList[arrCommandList.indexOf(command)].parameters[3];
			
				if (param)
				{
					for (var key in param)
					{
						var value = scriptFile.get_data(param[key], true);
						
						arrCommandList[arrCommandList.indexOf(command)].parameters[3][key] = value;
					}
				}
				break;
			case 108:
			case 408:	// comment
				arrCommandList[arrCommandList.indexOf(command)].parameters[0] = cmtFile.get_data();
				break;
				
			case 122:	// variable
				if (command.parameters[3] == 4)	// script variable
					arrCommandList[arrCommandList.indexOf(command)].parameters[4] = varFile.get_data();
				break;
				
			case 320:	// character name
				arrCommandList[arrCommandList.indexOf(command)].parameters[1] = charFile.get_data();
				break;

			case 325:	// Designation (profile)
				var changed = '';
				var dec = command.parameters[1].split("\n");
				dec.forEach(function(data) {
					if (changed.length > 0)
						changed += "\n";
					changed += desFile.get_data();
				});
				arrCommandList[arrCommandList.indexOf(command)].parameters[1] = changed;
				break;
			default:;
		}
	});
	
	return arrCommandList;
};

// CommonEventWorker 객체
// - 데이터베이스 추출 및 삽입
//
function CommonEventWorker()
{

	this.nameFile = new DataFile();	// Event name
	this.dlgFile = new DataFile();	// Dialog
	this.desFile = new DataFile();	// Designation
	this.scriptFile = new DataFile();	// Script
	this.cmtFile = new DataFile();	// Comment
	this.varFile = new DataFile();	// Script in variables
	this.charFile = new DataFile();	// Character name
	
	this.arrFilenames = [
		"CommonEvent_event_name.txt"			// #0
		, "CommonEvent_Dialog.txt"				// #1
		, "CommonEvent_designation.txt"			// #2
		, "Scripts_CommonEvent.txt"				// #3
		, "CommonEvent_Comment.txt"				// #4
		, "Scripts_CommonEvent_Variable.txt"	// #5
		, "CommonEvent_charname.txt"			// #6
		];
	this.arrDataFiles = [
		this.nameFile		// #0
		, this.dlgFile		// #1
		, this.desFile		// #2
		, this.scriptFile	// #3
		, this.cmtFile		// #4
		, this.varFile		// #5
		, this.charFile		// #6
		];
	this.arrDescNames = [
		"CommonEvent event_name"		// #0
		, "CommonEvent dialog"			// #1
		, "CommonEvent designation"		// #2
		, "CommonEvent script"			// #3
		, "CommonEvent comment"			// #4
		, "CommonEvent variables"		// #5
		, "CommonEvent char_name"		// #6
		];	
};

// CommonEventWorker.Extract 계열
//
CommonEventWorker.prototype.ExtractEvent = function(strJSONFilename)
{
	var worker = new EventWorker(
		this.dlgFile
		, this.desFile
		, this.scriptFile
		, this.cmtFile
		, this.varFile
		, this.charFile
	);
	
	var common_event = load_data(strJSONFilename);
	
	for(var i in common_event)
	{
		if (i == 0) continue;
		
		// Event name
		this.nameFile.put_id_name_block(common_event[i].id, common_event[i].name);
		this.nameFile.set_data(common_event[i].name);

		// event.note
		var cmt_event_put = false;
		if (common_event[i].note && common_event[i].note != '')
		{
			this.cmtFile.put_event_block(common_event[i].id, common_event[i].name);
			this.cmtFile.put_short_title_block("Event note");
			this.cmtFile.set_data(common_event[i].note);
			cmt_event_put = true;
		}

		worker.ExtractEvent(common_event[i].list, common_event[i].id, common_event[i].name, cmt_event_put);
	}

};
// CommonEventWorker.Extract
// - 메인 Extract 함수
CommonEventWorker.prototype.Extract = function(strExtractDir)
{
	var path = require('path');
	
	const arrFilenames = this.arrFilenames;
	const arrDataFiles = this.arrDataFiles;
	const arrDescNames = this.arrDescNames;
	
	for (var i in arrFilenames)
	{
		arrDataFiles[i].OpenAsWrite(path.join(strExtractDir, arrFilenames[i]));
		arrDataFiles[i].put_start_block();
		arrDataFiles[i].put_title_block(arrDescNames[i]);
	}

	this.ExtractEvent("CommonEvents.json");
	
	for (var i in arrFilenames)
	{	
		arrDataFiles[i].put_end_block();
		arrDataFiles[i].Close();
	}

};

// CommonEventWorker.Change 계열
//
CommonEventWorker.prototype.ChangeEvent = function(strJSONFilename)
{
	var worker = new EventWorker(
		this.dlgFile
		, this.desFile
		, this.scriptFile
		, this.cmtFile
		, this.varFile
		, this.charFile
	);
	
	var common_event = load_data(strJSONFilename);
	
	for(var i in common_event)
	{
		if (i == 0) continue;
		common_event[i].name = this.nameFile.get_data();
		
		if (common_event[i].note && common_event[i].note != '')
			common_event[i].note = this.cmtFile.get_data();
		common_event[i].list = worker.ChangeEvent(common_event[i].list);
	}
	save_data(strJSONFilename, common_event);
};
// CommonEventWorker.Change
// - 메인 Change 함수
CommonEventWorker.prototype.Change = function(strChangeDir)
{
	var path = require('path');
	
	const arrFilenames = this.arrFilenames;
	const arrDataFiles = this.arrDataFiles;

	try {
	for (var i in arrFilenames)
	{
		if (!arrDataFiles[i].OpenAsRead(path.join(strChangeDir, arrFilenames[i])))
			throw("OpenAsRead error: " + arrFilenames[i]);
	}
	
	this.ChangeEvent("CommonEvents.json");
	
	for (var i in arrFilenames)
		arrDataFiles[i].Close();
	
	} catch (e) {
		for (var i in arrFilenames)
			arrDataFiles[i].Close();
		
		console.error("CommonEventWorker.Change: error: " + e);
		throw(e);
	}
};

// MapWorker 객체
// - Map 추출 및 삽입
//
function MapWorker()
{
	this.infoMap = null;	// map information
	
	this.dataFile = new DataFile();	// MapInfo 혹은 displayName

	this.nameFile = new DataFile();	// Event name
	this.dlgFile = new DataFile();	// Dialog
	this.desFile = new DataFile();	// Designation
	this.scriptFile = new DataFile();	// Script
	this.cmtFile = new DataFile();	// Comment
	this.varFile = new DataFile();	// Script in variables
	this.charFile = new DataFile();	// Character name
	
	this.arrFilenames = [
		"Map_event_name.txt"			// #0
		, "Map_Dialog.txt"				// #1
		, "Map_event_designation.txt"	// #2
		, "Scripts_Map.txt"				// #3
		, "Map_event_Comment.txt"		// #4
		, "Scripts_Map_Variable.txt"	// #5
		, "Map_charname.txt"			// #6
		, "Map_display_name.txt"		// #7
		];
	// Map_display_name.txt
	// Mapinfo_map_name.txt
	
	this.arrDataFiles = [
		this.nameFile		// #0
		, this.dlgFile		// #1
		, this.desFile		// #2
		, this.scriptFile	// #3
		, this.cmtFile		// #4
		, this.varFile		// #5
		, this.charFile		// #6
		, this.dataFile		// #7
		];
	this.arrDescNames = [
		"MapEvent event_name"		// #0
		, "MapEvent dialog"			// #1
		, "MapEvent designation"		// #2
		, "MapEvent script"			// #3
		, "MapEvent comment"			// #4
		, "MapEvent variables"		// #5
		, "MapEvent char_name"		// #6
		, "MapEvent display_name"	// #7
		];	
};

MapWorker.prototype.FindMapIndex = function(nMapID)
{
	// 기본적으로 Map ID 와 infoMap 의 index 는 같은 것 같지만
	// 혹시 아닐 수도 있으면 nMapID 와 맞는 infoMap 의 index 를 찾아준다.
	// 0인 경우 찾지 못함.
	var ret = 0;
	
	if (this.infoMap == null)
		this.infoMap = load_data("MapInfos.json");
	
	if ( (this.infoMap[nMapID]) && (this.infoMap[nMapID].id == nMapID) )
		ret = nMapID;
	
	else
	{
		for (var i in this.infoMap)
		{
			if (!this.infoMap[i]) continue;
			if (this.infoMap[i].id == nMapID)
			{
				ret = i;
				break;
			}
		}
	}
	return ret;
};
MapWorker.prototype.LoadMapData = function()
{
	var arrMap = [];
	var strJSONFilename;
	var map = null;

	// load map data
	for (var i = 1; i < 1000; i++)
	{
		strJSONFilename = "Map" + i.padZero(3) + ".json";
		
		map = load_data(strJSONFilename);
		if (map)
			arrMap[i] = map;
	}
	return arrMap;
};
MapWorker.prototype.SaveMapData = function(arrMap)
{
	var strJSONFilename;
	
	// save map data
	for (var i in arrMap)
	{
		if (!arrMap[i]) continue;
		
		strJSONFilename = "Map" + i.padZero(3) + ".json";
		save_data(strJSONFilename, arrMap[i]);
	}
};



// MapWorker.Extract 계열
//
MapWorker.prototype.ExtractMapInfo = function()
{
	const infoMap = this.infoMap;
	
	const dataFile = this.dataFile;
	
	for (i in infoMap)
	{
		if (infoMap[i] == null) continue;
		
		if (i != infoMap[i].id)
		{
			dataFile.warning("map number ("+ i +") is not the same as infoMap.id ("+ infoMap[i].id +")");
			console.warn(infoMap[i]);
		}
		
		dataFile.put_id_name_block(infoMap[i].id, infoMap[i].name);
		dataFile.set_data(infoMap[i].name);
	}
};

MapWorker.prototype.ExtractEvent = function()
{
	
	var worker = new EventWorker(
		this.dlgFile
		, this.desFile
		, this.scriptFile
		, this.cmtFile
		, this.varFile
		, this.charFile
	);
	
	const dataFile = this.dataFile;
	var arrMap = this.LoadMapData();
	var map = null;
	var event = null;
	
	for(var i in arrMap)
	{
		if (!arrMap[i]) continue;
		map = arrMap[i];
		mapID = this.FindMapIndex(i);
		
		//if (this.infoMap[mapID] == null)
		//	continue;
	
		var mapName = "";
		
		// map_display_name
		if ( i != mapID)
		{
			mapName = map.displayName;
			dataFile.put_type_id_name_block("Map", i, mapName);
			dataFile.warn("map number (" + i + ") is not the same as mapID (" + mapID + ")");
		}
		else
		{
			mapName = this.infoMap[i].name;
			dataFile.put_type_id_name_block("Map", i, mapName);
		}
		dataFile.set_data(map.displayName);
		
		this.nameFile.put_map_block(i, mapName);
		
		// map.note
		var cmt_map_put = false;
		if (map.note && map.note != '')
		{
			this.cmtFile.put_map_block(i, mapName);
			this.cmtFile.put_short_title_block("Map note");
			this.cmtFile.set_data(map.note);
			cmt_map_put = true;
		}
		
		for (var j in map.events)
		{
			if (!map.events[j])	continue;
			event = map.events[j];
			
			// Event name
			if ( (event.name.length > 0) && (event.name.substring(0,2) != "EV") )
			{
				this.nameFile.put_id_name_block(event.id, event.name);
				this.nameFile.set_data(event.name);
			}
			
			// event.note
			var cmt_event_put = false;
			if (event.note && event.note != '')
			{
				if (cmt_map_put == false)
				{
					this.cmtFile.put_map_block(i, mapName);
					cmt_map_put = true;
				}
				this.cmtFile.put_event_block(event.id, event.name);
				this.cmtFile.put_short_title_block("Event note");
				this.cmtFile.set_data(event.note);
				cmt_event_put = true;
			}
			
			for (var page in event.pages)
				worker.ExtractEvent(event.pages[page].list, event.id, event.name, cmt_event_put, Number(page) + 1, i, mapName, cmt_map_put);
		}
	}	// for (var i...

};
// MapWorker.Extract
// - 메인 Extract 함수
MapWorker.prototype.Extract = function(strExtractDir)
{
	var path = require('path');
	
	this.infoMap = load_data("MapInfos.json");
	
	this.dataFile.OpenAsWrite(path.join(strExtractDir, "Mapinfo_map_name.txt"));
	this.dataFile.put_start_block();
	this.dataFile.put_title_block("Map info");
	
	this.ExtractMapInfo();
	
	this.dataFile.put_end_block();
	this.dataFile.Close();
	
	const arrFilenames = this.arrFilenames;
	const arrDataFiles = this.arrDataFiles;
	const arrDescNames = this.arrDescNames;
	
	for (var i in arrFilenames)
	{
		arrDataFiles[i].OpenAsWrite(path.join(strExtractDir, arrFilenames[i]));
		arrDataFiles[i].put_start_block();
		arrDataFiles[i].put_title_block(arrDescNames[i]);
	}

	this.ExtractEvent();
	
	for (var i in arrFilenames)
	{	
		arrDataFiles[i].put_end_block();
		arrDataFiles[i].Close();
	}
};

// MapWorker.Change 계열
//
MapWorker.prototype.ChangeMapInfo = function(strJSONFilename)
{
	var infoMap = load_data(strJSONFilename);
	
	const dataFile = this.dataFile;
	
	for (i in infoMap)
	{
		if (infoMap[i] == null) continue;
		
		infoMap[i].name = dataFile.get_data();
	}
	save_data(strJSONFilename, infoMap);
};

MapWorker.prototype.ChangeEvent = function()
{
	var worker = new EventWorker(
		this.dlgFile
		, this.desFile
		, this.scriptFile
		, this.cmtFile
		, this.varFile
		, this.charFile
	);
	
	const dataFile = this.dataFile;
	var arrMap = this.LoadMapData();
	var map = null;
	var event = null;
	var id = 0;
	
	for(var i in arrMap)
	{
		if (!arrMap[i]) continue;
		map = arrMap[i];
		mapID = this.FindMapIndex(i);
		
		if (mapID != i) 
		{
			console.warn("map number (" + i + ") is not the same as mapID (" + mapID + ")");
		}
		
		// map_display_name
		arrMap[i].displayName = dataFile.get_data();
		
		
		if (map.note && map.note != '')
		{
			arrMap[i].note = this.cmtFile.get_data();
		}
		
		for (var j in map.events)
		{
			if (!map.events[j]) continue;
			event = map.events[j];
			
			
			// Event name
			if ( (event.name.length > 0) && (event.name.substring(0,2) != "EV") )
			{
				arrMap[i].events[j].name = this.nameFile.get_data();
			}
			
			if (event.note && event.note != '')
			{
				arrMap[i].events[j].note = this.cmtFile.get_data();
			}

			for (var page in event.pages)
				arrMap[i].events[j].pages[page].list = worker.ChangeEvent(event.pages[page].list);
		}
	}
	this.SaveMapData(arrMap);
};
// MapWorker.Change
// - 메인 Change 함수
MapWorker.prototype.Change = function(strChangeDir)
{
	var path = require('path');
	
	const arrFilenames = this.arrFilenames;
	const arrDataFiles = this.arrDataFiles;
	
	try {
	
	if (!this.dataFile.OpenAsRead(path.join(strChangeDir, "Mapinfo_map_name.txt")))
		throw("OpenAsRead error: " + "MapInfo_map_name.txt");
	this.ChangeMapInfo("MapInfos.json");
	this.dataFile.Close();

	for (var i in arrFilenames)
	{
		if (!arrDataFiles[i].OpenAsRead(path.join(strChangeDir, arrFilenames[i])))
			throw("OpenAsRead error: " + arrFilenames[i]);
	}
	
	this.ChangeEvent();
	
	for (var i in arrFilenames)
		arrDataFiles[i].Close();
	
	
	} catch (e) {
		for (var i in arrFilenames)
			arrDataFiles[i].Close();
		
		console.error("MapWorker.Change: error: " + e);
		throw(e);
	}
};

// SystemWorker 객체
// - System, Term 추출 및 삽입
//
function SystemWorker()
{
	this.dataFile = new DataFile();
	
	this.arrMessages = [
		"actionFailure",
		"actorDamage",
		"actorDrain",
		"actorGain",
		"actorLoss",
		"actorNoDamage",
		"actorNoHit",
		"actorRecovery",
		"alwaysDash",
		"bgmVolume",
		"bgsVolume",
		"buffAdd",
		"buffRemove",
		"commandRemember",
		"counterAttack",
		"criticalToActor",
		"criticalToEnemy",
		"debuffAdd",
		"defeat",
		"emerge",
		"enemyDamage",
		"enemyDrain",
		"enemyGain",
		"enemyLoss",
		"enemyNoDamage",
		"enemyNoHit",
		"enemyRecovery",
		"escapeFailure",
		"escapeStart",
		"evasion",
		"expNext",
		"expTotal",
		"file",
		"levelUp",
		"loadMessage",
		"magicEvasion",
		"magicReflection",
		"meVolume",
		"obtainExp",
		"obtainGold",
		"obtainItem",
		"obtainSkill",
		"partyName",
		"possession",
		"preemptive",
		"saveMessage",
		"seVolume",
		"substitute",
		"surprise",
		"useItem",
		"victory"
		];
	
	this.arrMZMessages = [
		"touchUI",
		"autosave"
	];
	this.dataSystem = null;
};

// SystemWorker.Extract 계열
//
SystemWorker.prototype.ExtractSystem = function ()
{
	var dataSystem = this.dataSystem;
	var dataFile = this.dataFile;
	
	dataFile.put_title_block("System game_title");
	dataFile.set_data(dataSystem.gameTitle);
	
	dataFile.put_title_block("System locale");
	dataFile.set_data(dataSystem.locale);
	
	dataFile.put_title_block("System currency_unit");
	dataFile.set_data(dataSystem.currencyUnit);
	
	dataFile.put_title_block("System Variables");
	for (var i in dataSystem.variables)
		dataFile.set_data(dataSystem.variables[i], true);
	
	dataFile.put_title_block("System Switches");
	for (var i in dataSystem.switches)
		dataFile.set_data(dataSystem.switches[i], true);
	
	dataFile.put_title_block("System skill_types");
	for (var i in dataSystem.skillTypes)
		dataFile.set_data(dataSystem.skillTypes[i], true);
	
	dataFile.put_title_block("System elements");
	for (var i in dataSystem.elements)
		dataFile.set_data(dataSystem.elements[i], true);
	
	dataFile.put_title_block("System equip_types");
	for (var i in dataSystem.equipTypes)
		dataFile.set_data(dataSystem.equipTypes[i], true);
	
	dataFile.put_title_block("System weapon_types");
	for (var i in dataSystem.weaponTypes)
		dataFile.set_data(dataSystem.weaponTypes[i], true);
	
	dataFile.put_title_block("System armor_types");
	for (var i in dataSystem.armorTypes)
		dataFile.set_data(dataSystem.armorTypes[i], true);
		
	// RPG Maker MZ specific : advanced
	if (dataSystem.advanced)
	{
		dataFile.put_title_block("System advanced (MZ)");
		for (var key in dataSystem.advanced)
		{
			dataFile.put_short_title_block(key);
			dataFile.set_data(dataSystem.advanced[key]);
		}
	}
};

SystemWorker.prototype.ExtractTerm = function ()
{
	const dataTerms = this.dataSystem.terms;
	const dataFile = this.dataFile;
	const arrMessages = this.arrMessages;
	const arrMZMessages = this.arrMZMessages;
	
	dataFile.put_title_block("Basic(LV, lv HP, hp, MP, mp, TP, tp)");
	for (var i in dataTerms.basic)
		dataFile.set_data(dataTerms.basic[i]);
	
	dataFile.put_title_block("Params(MHP, MMP, ATK, DEF, MAT, MDF, AGI, LUK)");
	for (var i in dataTerms.params)
		dataFile.set_data(dataTerms.params[i]);
	
	dataFile.put_title_block("Commands");
	for (var i in dataTerms.commands)
		dataFile.set_data(dataTerms.commands[i]);

	dataFile.put_title_block("Messages");
	for (var i in arrMessages)
	{
		dataFile.put_short_title_block(arrMessages[i]);
		dataFile.set_data(dataTerms.messages[arrMessages[i]]);
	}
	
	// RPG Maker MZ additional messages
	if (dataTerms.messages[arrMZMessages[0]])
	{
		for (var i in arrMZMessages)
		{
			dataFile.put_short_title_block(arrMZMessages[i]);
			dataFile.set_data(dataTerms.messages[arrMZMessages[i]]);
		}
	}
};
// SystemWorker.Extract
// - 메인 Extract 함수
SystemWorker.prototype.Extract = function(strExtractDir)
{
	var path = require('path');
	
	this.dataSystem = load_data("System.json");
	
	// System.txt
	this.dataFile.OpenAsWrite(path.join(strExtractDir, "System.txt"));
	this.dataFile.put_start_block();
	this.dataFile.put_title_block("System");
	
	this.ExtractSystem();
	
	this.dataFile.put_end_block();
	this.dataFile.Close();
	
	// System_Term.txt
	this.dataFile.OpenAsWrite(path.join(strExtractDir, "System_Term.txt"));
	this.dataFile.put_start_block();
	this.dataFile.put_title_block("System Term");
	
	this.ExtractTerm();
	
	this.dataFile.put_end_block();
	this.dataFile.Close();
};

// SystemWorker.Change 계열
//
SystemWorker.prototype.ChangeSystem = function(strJSONFilename)
{
	const dataSystem = load_data(strJSONFilename);
	var dataFile = this.dataFile;
	
	dataSystem.gameTitle = dataFile.get_data();
	
	dataSystem.locale = dataFile.get_data();
	
	dataSystem.currencyUnit = dataFile.get_data();
	
	for(var i in dataSystem.variables)
		dataSystem.variables[i] = dataFile.get_data(dataSystem.variables[i], true);
	
	for(var i in dataSystem.switches)
		dataSystem.switches[i] = dataFile.get_data(dataSystem.switches[i], true);
	
	for(var i in dataSystem.skillTypes)
		dataSystem.skillTypes[i] = dataFile.get_data(dataSystem.skillTypes[i], true);
	
	for(var i in dataSystem.elements)
		dataSystem.elements[i] = dataFile.get_data(dataSystem.elements[i], true);
	
	for(var i in dataSystem.equipTypes)
		dataSystem.equipTypes[i] = dataFile.get_data(dataSystem.equipTypes[i], true);
	
	for(var i in dataSystem.weaponTypes)
		dataSystem.weaponTypes[i] = dataFile.get_data(dataSystem.weaponTypes[i], true);
	
	for(var i in dataSystem.armorTypes)
		dataSystem.armorTypes[i] = dataFile.get_data(dataSystem.armorTypes[i], true);
	
	// RPG Maker MZ specific : advanced
	if (dataSystem.advanced)
	{
		for (var key in dataSystem.advanced)
		{
			var origValue = dataSystem.advanced[key];
			
			if ((origValue === "") || isNaN(origValue))
			{
				// string or ""
				dataSystem.advanced[key] = dataFile.get_data();
			}
			else
			{
				// number
				dataSystem.advanced[key] = Number(dataFile.get_data());
			}
		}
	}
	
	save_data(strJSONFilename, dataSystem);
};

SystemWorker.prototype.ChangeTerm = function(strJSONFilename)
{
	const dataSystem = load_data(strJSONFilename);
	const dataFile = this.dataFile;
	const arrMessages = this.arrMessages;
	const arrMZMessages = this.arrMZMessages;
	
	for(var i in dataSystem.terms.basic)
		dataSystem.terms.basic[i] = dataFile.get_data();

	for(var i in dataSystem.terms.params)
		dataSystem.terms.params[i] = dataFile.get_data();
	
	for(var i in dataSystem.terms.commands)
		dataSystem.terms.commands[i] = dataFile.get_data();

	for(var i in arrMessages)
		dataSystem.terms.messages[arrMessages[i]] = dataFile.get_data();

	// RPG Maker MZ additional messages
	if (dataSystem.terms.messages[arrMZMessages[0]])
	{
		for (var i in arrMZMessages)
		{
			dataSystem.terms.messages[arrMZMessages[i]] = dataFile.get_data();
		}
	}

	save_data(strJSONFilename, dataSystem);
};
// SystemWorker.Change
// - 메인 Change 함수
SystemWorker.prototype.Change = function(strChangeDir)
{
	var path = require('path');
	
	const arrFilenames = this.arrFilenames;
	const arrDataFiles = this.arrDataFiles;

	try {
	
	if (!this.dataFile.OpenAsRead(path.join(strChangeDir, "System.txt")))
		throw("OpenAsRead error: " + "System.txt");
	this.ChangeSystem("System.json");
	this.dataFile.Close();

	if (!this.dataFile.OpenAsRead(path.join(strChangeDir, "System_Term.txt")))
		throw("OpenAsRead error: " + "System_Term.txt");
	this.ChangeTerm("System.json");
	this.dataFile.Close();
	
	} catch (e) {
		console.error("SystemWorker.Change: error: " + e);
		throw(e);
	}

};

// TroopsWorker 객체
// - Troops 추출 및 삽입
//
function TroopsWorker()
{

	this.nameFile = new DataFile();	// Event name
	this.dlgFile = new DataFile();	// Dialog
	this.desFile = new DataFile();	// Designation
	this.scriptFile = new DataFile();	// Script
	this.cmtFile = new DataFile();	// Comment
	this.varFile = new DataFile();	// Script in variables
	this.charFile = new DataFile();	// Character name
	
	this.arrFilenames = [
		"Troops.txt"						// #0
		, "Troops_event.txt"				// #1
		, "Troops_event_designation.txt"	// #2
		, "Scripts_Troops.txt"				// #3
		, "Troops_event_Comment.txt"		// #4
		, "Scripts_Troops_Variable.txt"		// #5
		, "Troops_charname.txt"				// #6
		];
	this.arrDataFiles = [
		this.nameFile		// #0
		, this.dlgFile		// #1
		, this.desFile		// #2
		, this.scriptFile	// #3
		, this.cmtFile		// #4
		, this.varFile		// #5
		, this.charFile		// #6
		];
	this.arrDescNames = [
		"Troops event_name"			// #0
		, "Troops dialog"			// #1
		, "Troops designation"		// #2
		, "Troops script"			// #3
		, "Troops comment"			// #4
		, "Troops variables"		// #5
		, "Troops char_name"		// #6
		];	
};

// TroopsWorker.Extract 계열
//
TroopsWorker.prototype.ExtractEvent = function(strJSONFilename)
{
	var worker = new EventWorker(
		this.dlgFile
		, this.desFile
		, this.scriptFile
		, this.cmtFile
		, this.varFile
		, this.charFile
	);
	
	var troops = load_data(strJSONFilename);
	var troop = null;
	
	for(var i in troops)
	{
		if (!troops[i]) continue;
		troop = troops[i];
		
		// Troop name
		this.nameFile.put_id_name_block(troop.id, troop.name);
		this.nameFile.set_data(troop.name);
		
		for (var page in troop.pages)
			worker.ExtractEvent(troop.pages[page].list, troop.id, troop.name, false, Number(page) + 1);
	}
};
// TroopsWorker.Extract
// - 메인 Extract 함수
TroopsWorker.prototype.Extract = function(strExtractDir)
{
	var path = require('path');
	
	const arrFilenames = this.arrFilenames;
	const arrDataFiles = this.arrDataFiles;
	const arrDescNames = this.arrDescNames;
	
	for (var i in arrFilenames)
	{
		arrDataFiles[i].OpenAsWrite(path.join(strExtractDir, arrFilenames[i]));
		arrDataFiles[i].put_start_block();
		arrDataFiles[i].put_title_block(arrDescNames[i]);
	}

	this.ExtractEvent("Troops.json");
	
	for (var i in arrFilenames)
	{	
		arrDataFiles[i].put_end_block();
		arrDataFiles[i].Close();
	}

};

// TroopsWorker.Change 계열
//
TroopsWorker.prototype.ChangeEvent = function(strJSONFilename)
{
	var worker = new EventWorker(
		this.dlgFile
		, this.desFile
		, this.scriptFile
		, this.cmtFile
		, this.varFile
		, this.charFile
	);
	
	var troops = load_data(strJSONFilename);
	var troop = null;
	
	for(var i in troops)
	{
		if (!troops[i]) continue;
		troop = troops[i];
		
		troops[i].name = this.nameFile.get_data();
		
		for (var page in troop.pages)
			troops[i].pages[page].list = worker.ChangeEvent(troop.pages[page].list);
	}
	save_data(strJSONFilename, troops);
};
// TroopsWorker.Change
// - 메인 Change 함수
TroopsWorker.prototype.Change = function(strChangeDir)
{
	var path = require('path');
	
	const arrFilenames = this.arrFilenames;
	const arrDataFiles = this.arrDataFiles;

	try {
	for (var i in arrFilenames)
	{
		if (!arrDataFiles[i].OpenAsRead(path.join(strChangeDir, arrFilenames[i])))
			throw("OpenAsRead error: " + arrFilenames[i]);
	}
	
	this.ChangeEvent("Troops.json");
	
	for (var i in arrFilenames)
		arrDataFiles[i].Close();
	
	} catch (e) {
		for (var i in arrFilenames)
			arrDataFiles[i].Close();
		
		console.error("TroopsWorker.Change: error: " + e);
		throw(e);
	}
};

function CopyWorker()
{
	this.path = require('path');
	this.fs = require('fs');
};

CopyWorker.prototype.CopyAll = function(strDirSource, strDirDest)
{
	const fs = this.fs;
	const path = this.path;
	
	var stats = null;
	var strSrcFilename = null;
	var strDestFilename = null;
	
	try
	{
	// Dest 폴더가 없으면 생성
	if (!fs.existsSync(strDirDest))
		fs.mkdirSync(strDirDest);

	var arrFiles = fs.readdirSync(strDirSource);
	for (var i in arrFiles)
	{
		strSrcFilename = path.join(strDirSource, arrFiles[i]);
		strDestFilename = path.join(strDirDest, arrFiles[i]);
		stats = fs.statSync(strSrcFilename);
		if (stats.isDirectory())
		{
			console.group();
			strSrcFilename = path.join(strSrcFilename, '/');
			strDestFilename = path.join(strDestFilename, '/');
			
			// recursive call
			this.CopyAll(strSrcFilename, strDestFilename);
			console.groupEnd();
		}
		else
		{
			fs.writeFileSync(strDestFilename, fs.readFileSync(strSrcFilename));
		}
	}
	} catch (e) {
		console.error("CopyWorker.CopyAll: error: " + e);
		console.log(strSrcFilename);
		throw(e);
	}
};

CopyWorker.prototype.Combine = function(strDirSource1, strDirSource2, strDirDest)
{
	const fs = this.fs;
	const path = this.path;
	
	var stats = null;
	var strSrcFilename1 = null;
	var strSrcFilename2 = null;
	var strDestFilename = null;
	
	var srcFile1 = new DataFile();
	var srcFile2 = new DataFile();
	var destFile = new DataFile();
	
	var strSrc1 = null;
	var strSrc2 = null;
	
	try
	{
	var arrFiles = fs.readdirSync(strDirSource1);

	for (var i in arrFiles)
	{
		strSrcFilename1 = path.join(strDirSource1, arrFiles[i]);
		strSrcFilename2 = path.join(strDirSource2, arrFiles[i]);
		strDestFilename = path.join(strDirDest, arrFiles[i]);
		
		stats = fs.statSync(strSrcFilename1);
		if (stats.isDirectory()) continue;	// 폴더는 무시
		
		if (!fs.existsSync(strSrcFilename2)) continue;	// 두번째 파일이 없으면 무시
		
		stats = fs.statSync(strSrcFilename2);
		if (stats.isDirectory()) continue;	// 폴더는 무시
		
		// 소스파일 읽기모드
		srcFile1.OpenAsRead(strSrcFilename1);
		srcFile2.OpenAsRead(strSrcFilename2);
		
		// 합치는 파일 쓰기모드
		destFile.OpenAsWrite(strDestFilename);
		
		while (!srcFile1.IsEOF())
		{
			// 데이터 읽고
			strSrc1 = srcFile1.gets();
			strSrc2 = srcFile2.gets();
			
			// 주석
			if (strSrc1.substring(0,2) == "#=")
			{
				destFile.puts(strSrc1);
			}
			else if (strSrc1.length > 1)
			{
				if (ExtractAndChanger.isMark)
				{
					strSrc1 = strSrc1.replaceAt(0, '0');
				}
				else
				{
					// 기본 line number 가 5자리이기 때문에 i는 5부터 시작
					for (var i = 5; i < strSrc1.length; i++)
					{
						if (strSrc1[i] == ':')
						{
							strSrc1 = strSrc1.replaceAt(i, '>');
							break;
						}
					}
				}
				
				destFile.puts(strSrc1);
				destFile.puts(strSrc2);
			}
		}	// while (!srcFile1...
		// 파일 닫기
		srcFile1.Close();
		srcFile2.Close();
		destFile.Close();
	}	// for (var i...
	} catch (e) {
		srcFile1.Close();
		srcFile2.Close();
		destFile.Close();

		console.error("CopyWorker.Combine: error: " + e);
		console.log(strSrcFilename1);
		throw(e);
	}
};
CopyWorker.prototype.Split = function(strDirSource, strDirDest1, strDirDest2)
{
	const fs = this.fs;
	const path = this.path;
	
	var stats = null;
	var strSrcFilename = null;
	var strDestFilename1 = null;
	var strDestFilename2 = null;
	
	var srcFile = new DataFile();
	var destFile1 = new DataFile();
	var destFile2 = new DataFile();
	
	var strSrc = null;
	
	try
	{
	
	var arrFiles = fs.readdirSync(strDirSource);
	
	for (var i in arrFiles)
	{
		strSrcFilename = path.join(strDirSource, arrFiles[i]);
		strDestFilename1 = path.join(strDirDest1, arrFiles[i]);
		strDestFilename2 = path.join(strDirDest2, arrFiles[i]);
		
		stats = fs.statSync(strSrcFilename);
		if (stats.isDirectory()) continue;	// 폴더는 무시
		// 소스파일 읽기모드
		srcFile.OpenAsRead(strSrcFilename);
		
		// 나누는 파일 쓰기모드
		destFile1.OpenAsWrite(strDestFilename1);
		destFile2.OpenAsWrite(strDestFilename2);
		
		while (!srcFile.IsEOF())
		{
			// 데이터 읽고
			strSrc = srcFile.gets();
			
			// 주석
			if (strSrc.substring(0,2) == "#=")
			{
				destFile1.puts(strSrc);
				destFile2.puts(strSrc);
			}
			else if (strSrc.length > 1)
			{
				if (ExtractAndChanger.isMark)
				{
					if (strSrc[0] == '0')
					{
						strSrc = strSrc.replaceAt(0, '1');
						destFile1.puts(strSrc);
					}
					else
						destFile2.puts(strSrc);
				}
				else
				{
					// 기본 line number 가 5자리이기 때문에 i는 5부터 시작
					for (var i = 5; i < strSrc.length; i++)
					{
						
						if (strSrc[i] == '>')
						{
							strSrc = strSrc.replaceAt(i, ':');
							destFile1.puts(strSrc);
							break;
						}
						else if (strSrc[i] == ':')
						{
							destFile2.puts(strSrc);
							break;
						}
					}
				}
			}
		}	// while (!srcFile...
		srcFile.Close();
		destFile1.Close();
		destFile2.Close();
	}
	
	} catch (e) {
		srcFile.Close();
		destFile1.Close();
		destFile2.Close();
		
		console.error("CopyWorker.Split: error: " + e);
		console.log(strSrcFilename);
		throw(e);
	}
};


// Init call from PluginManager
(function(){
	var parameters = PluginManager.parameters('ExtractAndChanger');

	var isMark = (parameters["isMark"] == "true")?true:false;
	
	ExtractAndChanger.Init(isMark);
	
	if (!ExtractAndChanger.isInit)
	{
		alert("Fatal error : Cannot initialize ExtractAndChanger");
		SceneManager.exit();
	}
})();