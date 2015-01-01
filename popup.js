/*
やりたいこと：
1つ前に表示していたタブをすぐに表示すること

やれたらいいこと：
1つ前だけではなくて、2つ前、3つ前とさかのぼれること
ショートカットキーを割り当てられること
ウィンドウをまたぐこともできるといい

気にすること：
ローカルストレージのexpireについて
一番最初の起動時にどうやってイベントを発火させるのか

実装方針：
タブが切り替わったタイミングで、そのタブ番号を順番に記録
そして、このアドオンが呼ばれたらローカルストレージを参照して、タブ番号を読み取り、そのタブを表示させる

ロジック 20150101：
タブ番号の配列1つと、その配列から表示するべきタブを示すインデックス変数（順番）がある
- 初期状態
	配列：空
	インデックス：0
A.通常遷移
	0. タブ遷移 or ウィンドウ遷移イベントで発火
	1. 現在のタブ番号を配列の先頭（現在のインデックス番号以降の配列）に追加
B.戻る遷移
	0. 戻るショートカットキーで発火
	1. インデックスを+1する
	2. インデックスをもとに配列から値を取得
C. 進む遷移
	0. 進むショートカットキーで発火
	1. インデックスを-1する
	2. インデックスをもとに配列から値を取得

必要な関数
	現在のタブ番号を追加
		addCurrentTab
	戻る処理
		goForward
	進む処理
		goBackward
*/

// 最初の読み込み
// TODO : set history upon initial loading
chrome.windows.getLastFocused(function(window){
	var queryInfo = {
		active: true,
		windowId: window.id
	};
	chrome.tabs.query(queryInfo, function(tabs) {
		var index = getStoredIndex();
		addCurrentTab(buildValue(window.id, tabs[0].id), index);
		resetIndex();
	});
});

localStorage.clear();
resetIndex();
var itself = 'itself';
removeByItself();

// upon commands inputed
chrome.commands.onCommand.addListener(function(command) {
	if (command == 'go-backward') {
		move(Number(1));
	} else {
		move(Number(-1));
	}
});

function move(increment) {
	var current_index = getStoredIndex();
	// lol
	var next_index = parseInt(current_index) + parseInt(increment);
	var tabs = getStoredTabs();
	var target_tab = tabs[next_index];
	var split = target_tab.split(":");
	var target_tabid = split[1];
	chrome.tabs.get(parseInt(target_tabid), function(tab) {
		setByItself();
		updateIndex(increment);
		chrome.tabs.highlight({tabs: tab.index, windowId: tab.windowId}, function(){});
		chrome.windows.update(tab.windowId, {focused: true});
	});
}

function setByItself() {
	localStorage[itself] = JSON.stringify(true);
}

function removeByItself() {
	localStorage[itself] = JSON.stringify(false);
}

function isByItself() {
	return JSON.parse(localStorage[itself]);
}

// タブが切り替わった際のイベント
chrome.tabs.onActivated.addListener(function(info) {

	// 通常の遷移かアドオンによる遷移かを判定
	var isbyitself = isByItself();
	// アドオンによる遷移
	if (isbyitself) {
		removeByItself();
		return;
	// 通常遷移
	} else {
		var index = getStoredIndex();
		addCurrentTab(buildValue(info.windowId, info.tabId), index);
		resetIndex();
	}
});

function getTabsByQuery(queryInfo,callback) {
	chrome.tabs.query(queryInfo, function(tabs) {
		callback(tabs[0].id);
	});
}

// ウィンドウが切り替わった際のイベント
chrome.windows.onFocusChanged.addListener(function onWindowChanged(_windowId) {
	// TODO : consider if window changes should be caught or not later
	if (true) {
		return;
	}
	// windowIdが-1の場合は他のアプリケーションなので無視
	if (_windowId == -1) {
		return;
	}

	var queryInfo = {
		active: true,
		windowId: _windowId
	};
	// 順番を保障したいので、チェーンさせる（あってるのか、、、）
	getTabsByQuery(queryInfo, function(tabId) {
		/*
		if(localStorage[hist_key] && (localStorage[hist_key].split(",").last() == buildValue(_windowId, tabId))) {
				console.debug("the same!");
		} else {
				console.debug("Actually window changed!");
				if (localStorage[hist_key]) {
					localStorage[hist_key] = localStorage[hist_key] + "," + buildValue(_windowId, tabId);
				} else {
					console.debug("first time:" + _windowId + "/" + tabId);
					localStorage[hist_key] = buildValue(_windowId, tabId);
				}
		}
		*/
		var index = getStoredIndex();
		addCurrentTab(buildValue(_windowId, tabId), index);
		resetIndex();
	});

});


function addCurrentTab(val, index) {
	var tabs = getStoredTabs();
	var added_tabs = [val].concat(drop(tabs,index));
	updateTabs(added_tabs);
}

function drop(x, n){
	var a = [];
	for (var i = n, l = x.length; i < l; i++) {
		a.push(x[i]);
	}
	return a;
};

function getStoredIndex() {
	return localStorage['index'];
}

function resetIndex() {
	localStorage['index'] = Number (0);
}

function updateIndex(num) {
	localStorage['index'] = parseInt(getStoredIndex()) + parseInt(num);
}

// return array of tabs
function getStoredTabs() {
	var stored_tabs = localStorage['tabs'];
	var tabs = (stored_tabs) ? JSON.parse(stored_tabs) : [];
	return tabs;
}

function updateTabs(tabs) {
	localStorage['tabs'] = JSON.stringify(tabs);
}

function buildValue(windowId, tabId){
	return windowId + ":" + tabId;
}
