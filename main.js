// javascript:(function(url){s=document.createElement('script');s.src=url;document.body.appendChild(s);})('https://raw.githubusercontent.com/mixberryparfait/kankore-quest/main/main.js')

'use strict';

///// 表示初期化 /////

$('head').append('<link href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">');

$('head').append($('<style>').text(`

#quest_manager {
	color: #444;
	width: 100vw;
	height: 100vh;
	padding: 2em;
	overflow: auto;
}

#quest_search_container {
	position: fixed;
	top: 1em;
	right: 1em;

	display: flex;
	align-items: center;
	padding: 1em;

	backdrop-filter: blur(20px);
	border: 1px solid rgba(255, 255, 255, 0.8);
	border-radius: 5px;	
}

#quest_popup, #tree_popup {
	display: none;

	position: fixed;
	left: 1em;
	right: 1em;
	bottom: 1em;

	backdrop-filter: blur(20px);
	border: 1px solid rgba(255, 255, 255, 0.8);
	border-radius: 5px;

	padding: 1em;
}

#quest_popup {
	top: 60px;
}

#tree_popup {
	top: 50%;
}

#close_quest_results, #close_tree {
	position: fixed;
	right: 1em;
}

#quest_results_container, #tree_container {
	margin-top: 30px;
	height: calc(100% - 30px);
	overflow: auto;    
	padding: 1em;
  display: flex;
  justify-content: center;
  align-items: stretch;
}

#tree {
	flex-grow: 1;
}

#quest_search{
  box-sizing: border-box;
  position: relative;
  border: 1px solid #ccf;
  border-radius: 1em;
  height: 2em;
  width: 20em;
  padding-left: 1em;
  overflow: hidden;
  background-color: white;
  display: flex;
  align-items: stretch;
}

#quest_search input[type="text"] {
  border: none;
  flex-grow: 1;
}
#quest_search input[type="text"]:focus {
  outline: 0;
}
#quest_search input[type="submit"]{
  cursor: pointer;
  font-family: FontAwesome;
  font-size: 150%;
  color: #3879D9;
  margin: 0;
  padding: 0 0.5em;
  border: none;
  border-left: solid 1px #ccf;
  background-color: #eef;
}

#quest_search_container #status {
	margin: 0 2em;
}

.status-select label {
  display: block;
}
.status-select input {
  display: none;
}
.status-select input[type="radio"] + * {
  color: #ccc;
}
.status-select input[type="radio"]:checked + * {
  color: #444;
}
.display-tree {
	width: 7em;
	padding: 0.25em 0.5em;
  background-color: #eef;
}

`));

$('body').append($('<div id="quest_manager">'));

// index => [prev_index]
const triggers = [];

// id => index
const indexes = {};

// index => row
const quests = [];


//////////////////////

const getTable = (tableEl) => {
  var cells2D = [];
  var rows = tableEl.rows;
  var rowsLength = rows.length;
  for (var r = 0; r < rowsLength; ++r) {
    cells2D[r] = [];
  }
  for (var r = 0; r < rowsLength; ++r) {
    var cells = rows[r].cells;
    var x = 0;
    for (var c = 0, cellsLength = cells.length; c < cellsLength; ++c) {
      var cell = cells[c];
      while (cells2D[r][x]) {
        ++x;
      }
      var x3 = x + (cell.colSpan || 1);
      var y3 = r + (cell.rowSpan || 1);
      for (var y2 = r; y2 < y3; ++y2) {
        for (var x2 = x; x2 < x3; ++x2) {
          cells2D[y2][x2] = cell;
        }
      }
      x = x3;
    }
  }
  return cells2D;
}

//////////////////////

$("h2:contains('最新任務')").nextUntil("h2:contains('終了済み')").find("table").each((_, t) => {
	const th = $(t).find('thead > tr > th')[0];

	// ID ではじまるテーブル
	if(th && $(th).text() == 'ID') {

		const table = getTable(t);

		let prev_id = null;
	  // 行（任務１つずつ）
	  L:
	  for(const r of table) {
	  	if(!r[8])
	  		continue;

			// row html
			const new_row = $('<tr>');

	  	for(let c of r) {
			  // th があったら無視　e.g.マンスリー合計
	  		if(c.tagName.toLowerCase() == 'th')
	  			continue L;
			  // colspan があったら無視
	  		if(c.getAttribute("colspan"))
	  			continue L;
	  		c = $(c).clone()[0];
	  		if(c.getAttribute("rowspan"))
	  			c.removeAttribute("rowspan");
				new_row.append(c);
	  	}
	  	if(r.length == 9) {
				new_row.append('<td></td>');
	  	}


		  // ID	
			const id = r[0].textContent;

			if(id == '')
				continue L;

			// category
			let category = id.charCodeAt(0) - 'A'.charCodeAt(0);
			if(category < 0 || category > 7)
				continue L;

			const index = quests.length;
			indexes[id] = index;

			quests.push(new_row);

		  // 前提リンク
			triggers.push([]);

			if($(r[8]).text().indexOf('↑') >= 0) {
				if(prev_id == null)
					console.log(id);
				else
					triggers[index].push(prev_id);
			}

			$(r[8]).find('a').each((_, a) => {
				const href = $(a).attr('href');
				if(href && href.indexOf('#id-') >= 0) {
					const precondition = href.substring(href.indexOf('#id-') + 4);
					if(precondition)
						triggers[index].push(precondition);
				}
			});

			prev_id = id;
		};
	}
});

console.log(quests.length);

// index => status  0: 未出現　1: 出現中　2: クリア済
const status = Array.from({ length: quests.length }, () => 1);
const nexts = Array.from({ length: quests.length }, () => []);
const prevs = Array.from({ length: quests.length }, () => []);
console.log(prevs.length);

for(let i = 0; i < triggers.length; i++) {
	for(let id of triggers[i]) {
		if(quests[indexes[id]] && quests[i]) {

			prevs[i].push(indexes[id]);
			nexts[indexes[id]].push(i);
			status[i] = 0;
		}
	}
}

for(let i in quests) {
	quests[i].append(`
    <td>
    <div class="status-select">
    <label><input type="radio" name="status[${i}]" data-index=${i} value=0${status[i] == 0 ? ' checked' : ''}><span>未出現</span></label>
    <label><input type="radio" name="status[${i}]" data-index=${i} value=1${status[i] == 1 ? ' checked' : ''}><span>出現中</span></label>
    <label><input type="radio" name="status[${i}]" data-index=${i} value=2${status[i] == 2 ? ' checked' : ''}><span>達成済</span></label>
    </div>
    <button class="display-tree" data-index=${i}>ツリー表示</button>
    </td>
	`);	
}

///// グラフ /////

let chart_initialized = false;

const displayTree = async (root) => {
	if(!chart_initialized) {
	  try {
	    // await loadScript('https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js');
	    // await loadScript('https://cdn.jsdelivr.net/npm/mxgraph@3.9.12/javascript/mxClient.min.js');
	    await loadScript('https://cdn.jsdelivr.net/npm/@maxgraph/core@0.3.0/dist/maxgraph.js');

	  } catch (error) {
	    console.error('Failed to load ECharts:', error);
	    return;
	  }
	}
	chart_initialized = true;	
	// console.log(triggers)
	// console.log(prevs)


	const nodes = [];
	const indexes = {};

	const iter = (index) => {
		if(indexes[index] !== undefined) {
			const n = nodes[indexes[index]];
			n.value++;
			return false;
		}

		const q = quests[index].find('td');
		const id = $(q[0]).text();
		const name = $(q[1]).text();
		let category = id.charCodeAt(0) - 'A'.charCodeAt(0);
		if(category < 0 || category > 7) category = 7;
		indexes[index] = nodes.length;
		nodes.push({id: id, name: name, index: index, category: category});

		let new_node = false;
		if(prevs[index] && prevs[index].length > 0) {
			for(let p of prevs[index]) {
				new_node |= iter(p);
			}
		}

		return true;
	}
	iter(root);

	$('#tree').empty();
	$('#tree_popup').show();

	const container = document.getElementById('tree');
	const graph = new maxgraph.Graph(container);
	const parent = graph.getDefaultParent()
	const layout = new maxgraph.HierarchicalLayout(graph);
	layout.interRankCellSpacing = 20; // 縦の間隔

	// 文字幅
	const ctx = document.createElement('canvas').getContext('2d');
  const style = getComputedStyle(document.querySelector('#tree'));
  const font = style.getPropertyValue('font');
  ctx.font = font;

	// ノード追加
	const colors = ['#bfb', '#fdd', '#dfd', '#ddf', '#ffd', '#feb', '#ecf', '#fef'];
	//const colors = ['#1d1', '#d77', '#7d7', '#77d', '#dd7', '#da1', '#a4d', '#dad'];
	const vertices = nodes.map(n => {
		const cell = graph.insertVertex({
		  parent: parent,
		  id: n.index,
		  value: n.name, //`<a href="#id-${n.id}">${n.name}</a>`, 
		  position: [0, 0],	
		  size: [Math.max(ctx.measureText(n.name).width + 10, 150), 30],
		  style: { fillColor: colors[n.category], gradientColor: '#fff', borderColor: '#fff' },	
		})
	  return cell;
	});

	// エッジ追加
	for(let i = 0; i < nodes.length; i++) {
		const index = nodes[i].index;
		for(let prev_index of prevs[index]) {
			graph.insertEdge({
				parent: parent, 
				source: vertices[indexes[prev_index]], 
				target: vertices[i],
				style: {rounded: true}
			})	
		}
	}

  // invalidat edit
	graph.setEnabled(false);
  graph.addListener(maxgraph.InternalEvent.CLICK, (sender, evt) => {
    var cell = evt.getProperty("cell"); // cell may be null
    if (cell != null) {
      const q = quests[cell.id].find('td');
      const id = $(q[0]).text();
    	location.href = '#id-' + id;
    	scrollBy(0, -70);
    }
    evt.consume();
  });

	// graph.setHtmlLabels(true);
  // graph.getLinkForCell = cell => {
	// 	const q = quests[cell.id].find('td');
	// 	const id = $(q[0]).text();
  // 	console.log(id);
  // 	return '#id-' + id;
  // }

	// graph.setTooltips(true);
  // graph.getTooltipForCell = (cell) => {
  // 	console.log(cell.id);
  // 	return quests[cell.id | 0].get(0)
  // }

	// 追加したノード・エッジに基づいてレイアウトの自動計算を行う
	layout.execute(parent);
};

const loadScript = (url) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}


$('#quest_manager').append(`
  <div id="quest_search_container">

    <form id="quest_search">
      <input type="text" placeholder="キーワード検索">
      <input type="submit" value="&#xf002">
    </form>

	  <div id="status">
	    <label>
	      <input type="checkbox" class="checkbox" name="status" value="0" checked>未出現
	    </label>
	    <label>
	      <input type="checkbox" class="checkbox" name="status" value="1" checked>出現中
	    </label>
	    <label>
	      <input type="checkbox" class="checkbox" name="status" value="2" checked>達成済み
	    </label>
	  </div>


	</div>

  <div id="quest_popup">
    <button id="close_quest_results">検索結果を閉じる</button>
    <div id="quest_results_container">
			<table id="quest_search_results">
			  <thead style="display:none">
			    <tr>
			      <th>ID</th>
			      <th>名前</th>
			      <th>説明</th>
			      <th colspan=4>獲得資源</th>
			      <th>獲得アイテム</th>
			      <th>開放条件/備考	実装</th>
			      <th>実装</th>
			      <th>ステータス</th>
			    </tr>
			  </thead>
			  <tbody>
			    <!-- 検索結果はここに追加される -->
			  </tbody>
			</table>
		</div>
	</div>

  <div id="tree_popup">
    <button id="close_tree">ツリーを閉じる</button>
    <div id="tree_container">
      <div id="tree">
		  </div>
		</div>
	</div>
`);


$('#close_quest_results').on('click', (e) => {
	$('#quest_popup').hide();
});

$('#close_tree').on('click', (e) => {
	$('#tree_popup').hide();
});

$('#quest_search').on('submit', (e) => {
	e.preventDefault();
	const words = $('#quest_search input[type="text"]').val().split(/[\s　]+/);

	const status_cond = [false,false,false];
	$('#status :checkbox:checked').each((_, e) => {
		status_cond[$(e).val()] = true;
	});

	const results = $('<tbody>');
	let result_exists = false;
	L:
	for(const i in quests) {
		// ステータス条件
		if(!status_cond[status[i]]) continue;
		const q = quests[i];
		for(const w of words) {
			if($(q).text().indexOf(w) >= 0) {
				results.append(q);
				result_exists = true;
				continue L;
			}
		}
	}
	if(result_exists) {
	  $('#quest_search_results tbody').html(results.html());
		$('#quest_search_results thead').show();

		$('input[name^="status"]:radio').change((e) => {
			status[$(e.target).data('index')] = $(e.target).val();
		});

		$('.display-tree').on('click', (e) => {
			// console.log($(e.target).data('index'));
			displayTree($(e.target).data('index'));
		});

	}
	else {
		$('#quest_search_results tbody').html('<tr><td>検索結果がありません</td></tr>');
		$('#quest_search_results thead').hide();
	}
	$('#quest_popup').show();


});
