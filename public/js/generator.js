const genimages = async ()=> {
const host = window.location.host;
const images = await fetch(`http://${host}/images.json`).then(res => res.json());
const sizes = await fetch(`http://${host}/sizes.json`).then(res => res.json());
const featured = await fetch(`http://${host}/featured.json`).then(res => res.json());

const container = document.getElementById("gallery");

// loop through images and create image elements
images.forEach(function (image) {
	sizes.sort();
	const img = document.createElement("img");
	img.src = `http://${host}/image/${image}?sz=${sizes[0]}`;
	img.classList = ["image-table"];
	img.onclick = () => {
		window.location.href = `http://${host}/preview?img=image/${image}`;
	}
	container.appendChild(img);
});

}
genimages();
