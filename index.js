const app = require('express')();
const fs = require('fs');
const path = require('path');
const request = require("request");
const global_settings = JSON.parse(fs.readFileSync('gallery-settings.json'));

var sitemap = ["", "robots.txt", "favicon.ico", "images.json", "sitemap.xml", "sizes.json", "featured.json", "main.css", "generator.js"];

const readdirRec = (prefix, dir) => {
	if (dir === undefined) dir = "";
	let res = [];
	fs.readdirSync(path.resolve(prefix + dir)).forEach(file => {
		file = dir + file;
		const stat = fs.statSync(path.resolve(prefix + file));
		if (stat && stat.isDirectory())
			res = res.concat(readdirRec(prefix, file + '/'));
		else
			res.push(file);
	});
	return res;
}
const filterImages = (image) => {
	let ret = true;
	global_settings["exclude"].forEach( match => {
		ret &= image.match(new RegExp(match)) === null;
	});
	return ret;
}

const genSiteMap = () => {
	const lastmod = new Date(Date.now()).toISOString().split("T")[0];
	let response = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">";
	sitemap.forEach(function (URLs) {
		response += `<url>\n<loc>https://${global_settings["site-name"]}/${URLs}</loc>\n`;
		response += "<lastmod>" + lastmod + "</lastmod>\n</url>\n";
	});
	response += "</urlset>";
	app.get("/sitemap.xml", (req, res) => {
		res.send(response);
		res.status(200).end();
	});
}

readdirRec('./gallery/').filter(filterImages).forEach(file => {
	app.get('/image/' + file, (req, res) => {
		res.sendFile('./gallery/' + file, { root: __dirname });
	});
	sitemap.push('image/' + file);
});

app.get('/images.json', (req, res) => {
	res.json(readdirRec('./gallery/').filter(filterImages));
});

app.get('/sizes.json', (req, res) => {
	res.json(global_settings["cache-sz"]);
});

app.get('/featured.json', (req, res) => {
	res.json(global_settings["featured"]);
});

app.get('/', function (req, res) {
	res.sendFile('./public/main.html', { root: __dirname },);

});

app.get('/main.css', function (req, res) {
	res.sendFile('./public/css/main.css', { root: __dirname },);

});

app.get('/generator.js', function (req, res) {
	res.sendFile('./public/js/generator.js', { root: __dirname },);

});

app.get("/robots.txt", (req, res) => {
	res.send(`User-agent: *\nAllow: /\nSitemap: https://${global_settings["site-name"]}/sitemap.xml`);
	res.status(200).end();
});

genSiteMap();

app.use(function (req, res) {
	res.status(404).sendFile('./public/404.html', { root: __dirname },);

});

app.listen(global_settings["port"]);
request.get(`http://www.google.com/ping?sitemap=https://${global_settings["site-name"]}/sitemap.xml`);
request.get(`http://www.bing.com/ping?sitemap=https://${global_settings["site-name"]}/sitemap.xml`);
