import PhotoSwipeLightbox from 'https://cdnjs.cloudflare.com/ajax/libs/photoswipe/5.2.2/photoswipe-lightbox.esm.min.js';
import PhotoSwipe from 'https://cdnjs.cloudflare.com/ajax/libs/photoswipe/5.2.2/photoswipe.esm.min.js';

let global_sections = {};
const images = await fetch(`images.json`).then(res => res.json());
const sizes = await fetch(`sizes.json`).then(res => res.json());
const featured = await fetch(`featured.json`).then(res => res.json());
const sections = await fetch(`sections.json`).then(res => res.json());

const AddImage = (parent, image) => {
	const template = document.getElementById("template").cloneNode(true);
	template.hidden = false;
	template.id = "";
	template.children[0].children[0].src = `image/${image}?sz=${sizes[0]}`;
	template.children[0].children[0].setAttribute("data-src", `image/${image}?sz=${sizes[0]}`);
	template.children[0].href = `image/${image}`;
	template.children[0].setAttribute("data-pswp-src", `image/${image}`);
	parent.appendChild(template);
}

const AddSection = (section, title, description) => {
	const parent = document.getElementById("template-section").cloneNode(true);
	parent.id = `${section}-section`;
	parent.children[0].children[0].innerHTML = title;
	parent.children[0].children[1].innerHTML = description;
	parent.children[1].classList.add(`${section}-gallery`);
	parent.children[1].children[0].remove();
	global_sections[`${section}-gallery`] = parent.children[1];
	return parent;
}

const CheckSections = (image) => {
	let ret = false;
	Object.keys(sections).forEach(section => {
		if (sections[section].includes.includes(image))
			ret = section;
	});
	return ret;
}

const Entry = () => {

	images.forEach(function (image) {
		sizes.sort();
		if (featured.includes(image)) {
			if (!("featured-gallery" in global_sections)) {
				document.getElementById("gallery").prepend(AddSection("featured", 	"Featured:", ""));
			}
			AddImage(global_sections["featured-gallery"], image);
		}
		const section = CheckSections(image);
		if (section !== false) {
			let description = sections[section].description;
			let title = sections[section].title;
			if (!(`${section}-gallery` in global_sections)) {
				document.getElementById("gallery").appendChild(AddSection(section, title, 	description));
			}
			AddImage(global_sections[`${section}-gallery`], image);
		} else {
			if (!("global-gallery" in global_sections)) {
				document.getElementById("gallery").appendChild(AddSection("global", 	"Photos:", ""));
			}
			AddImage(global_sections["global-gallery"], image);
		}

	});

	document.getElementById("template-section").remove();

	const observer = lozad();
	observer.observe();


	const lightbox = new PhotoSwipeLightbox({
		pswpModule: PhotoSwipe,
		gallery: '.section-images',
		children: 'a'
	});

	lightbox.init();
}

Entry();
