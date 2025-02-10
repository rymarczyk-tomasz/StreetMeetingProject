import logo from "../assets/img/Logo 2.0/SVG/Logo_4.svg"
const Navbar = () => {
  return (
    <div className='px-4 flex flex-row  max-w-[1240px] mx-auto h-14 justify-between items-center text-black-100'>
 <img src={logo} className=" h-7 w-28 object-scale-down ml-10" alt="logo" />
      
      <ul className="font-chakra  font text-black text-opacity-65 mr-10 flex uppercase gap-3  mr-20">
        <li className="  hover:text-black">Home</li>
        <li className=" hover:text-black ">Event</li>
        <li className=" hover:text-black ">Galeria</li>
        <li className=" hover:text-black ">Kontakt</li>
        <li className=" hover:text-black">Formularz</li>
        <li className=" hover:text-black ">Faq</li>
        <li className=" hover:text-black">Regulamin</li>
      </ul>
    </div>
  )
}

export default Navbar
