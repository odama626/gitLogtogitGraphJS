function parse(str, reg) {
	let out = reg.exec(str);
	return out? out[0] : '';
}


function parseCommit(commit) {
	let hash = parse(commit, /.+\n/g);
	let branch = parse(hash, /\t.+/g);
	let author = parse(commit, /Author:.+\n/g);
	let date = parse(commit, /Date:.+\n/g);
	let merge = parse(commit, /Merge:.+\n/g);
	let msg = '';
	let summary = '';
	let tag;
	if (merge.length == 0) {
		msg = parse(commit, /\n\n.+\n\n/g);
		summary = commit.slice(hash.length+author.length+date.length+msg.length);
	} else {
		msg = parse(commit, /\n\n.+/g);
	}

	author = author.slice(author.indexOf(':')+1);
	date = date.slice(date.indexOf(':')+1);
	merge = merge.slice(merge.indexOf(':')+1).trim();
	merge = merge.split(' ');

	if (branch.indexOf('tag:') > 0) {
		tag = parse(branch, /\(.+\)/g);
		tag = tag.slice(1+'tag:'.length, tag.length-1).trim();
		branch = branch.slice(0, branch.indexOf('('));
		console.log(branch, '|', tag);
		console.log(commit);
	}

	if (branch.indexOf('(') > 0)
		branch = branch.slice(0, branch.indexOf('('))

	return {
		hash: hash.trim(),
		branch: branch.trim(),
		author: author.trim(),
		date: date.trim(),
		msg: msg.trim(),
		merge: merge.length > 1? merge : null,
		summary: summary.trim(),
		raw: commit,
		tag: tag
	}
}

function getCommits() {
	var revCommits = data.split('commit');
	revCommits = revCommits.slice(1);
	var commits = []
	revCommits.forEach( commit => commits.unshift(commit.trim()));
	return commits;
}

function normalizeChangesVisual(additions, deletions, newSize) {
	let total = additions.length + deletions.length;
	return {
		additions: additions.slice(0, additions.length / total * newSize),
		deletions: deletions.slice(0, deletions.length / total * newSize)
	}
}

function gitHtmlDiff(str)
{
	str = str.split('\n');
	str = str.map( line => {
		line = line.trim();
		if (line.indexOf('|') > 0) {
			line = line.split('|');
			line = line.map( part => part.trim());
			let filename = `<span class='filename'>${line[0]}</span>`;

			let { additions, deletions } = normalizeChangesVisual(parse(line[1], /\++/g), parse(line[1], /\-+/g), 10);

			let info = `<span class='count'>${ parse(line[1], /\d+/g) }</span>
									<span class='insertions'>${additions }</span>
									<span class='deletions'>${ deletions }</span>`;
			line = `${filename} <span class='changes'>${info}</span>`;
		}
		return `<div class='line'>${line}</div>`
	});
  return str.join('');
}

var refs = {};
var hashMap = {}; // maps commits to branches

var myTemplateConfig = {
  colors: [ "#008FB5", "#979797"], // branches colors, 1 per column
  branch: {
    lineWidth: 8,
    spacingX: 50,
    showLabel: true,                  // display branch names on graph
		font: 'normal 12pt Arial'
  },
  commit: {
    spacingY: -50,
    dot: {
      size: 10
    },
    message: {
      displayAuthor: true,
      displayBranch: false,
      displayHash: false,
      font: "normal 12pt Arial"
    },
    shouldDisplayTooltipsInCompactMode: true, // default = true
    tooltipHTMLFormatter: function ( commit ) {
      return `<div class='commit-info'>
								<div class='author'> ${commit.message.author} </div>
								<div class='branch'> ${commit.message.branch} </div>
								<div class='message'>${commit.message.msg} </div>
								<div class='summary'>${gitHtmlDiff(commit.message.summary)} </div>
							</div>
				`
			;
    }
  }
};
var myTemplate = new GitGraph.Template( myTemplateConfig );

var gitGraph = new GitGraph({
	template: myTemplate,
	orientation: 'vertical-reverse',
	mode: 'compact'
});


function nodeBuilder(node) {
	new Promise((resolve, reject) => {
		if (!refs[node.branch]) {
			refs[node.branch] = gitGraph.branch(node.branch);
		}
		hashMap[node.hash.slice(0, 7)] = refs[node.branch];
		let details = {
			branchName: node.branch,
			sha1: node.hash,
			message: node,
			tag: node.tag,
		};


		if (node.merge) {
			hashMap[node.merge[1]].merge(hashMap[node.merge[0]], details)
		} else {
			refs[node.branch].commit(details);
		}
		resolve();
	});
}

function buildGraph() {

	commits = getCommits();
	//console.log(commits);
	commits = commits.map(parseCommit);
	//console.log(commits);



	commits.forEach(nodeBuilder);
}

buildGraph();
