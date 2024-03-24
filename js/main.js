const nav = document.querySelector('.navbar-collapse')
const footerYear = document.querySelector('.footer-year')

document.addEventListener('click', () => {
	if (nav.classList.contains('show')) {
		nav.classList.remove('show')
	}
})

const handleCurrentYear = () => {
	const year = new Date().getFullYear()
	footerYear.innerText = year
}

handleCurrentYear()
