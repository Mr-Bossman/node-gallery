const genimages = async ()=> {
const host = window.location.host;
const images = await fetch(`http://${host}/images.json`).then(res => res.json());
const sizes = await fetch(`http://${host}/images.json`).then(res => res.json());
const featured = await fetch(`http://${host}/images.json`).then(res => res.json());

const container = document.getElementById("gallery");

// loop through images and create image elements
images.forEach(function (image) {
	const img = document.createElement("img");
	img.src = `http://${host}/image/${image}`;
	img.classList = ["image-table"];
	img.onclick = () => {
		window.location.href = `http://${host}/image/${image}`;
	}
	container.appendChild(img);
});

}
genimages();
