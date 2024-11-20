import Image from "next/image";
import Map from "./components/Map";
import Search from "./components/Search";

export default function Home() {
  return (
    <div className="h-screen flex flex-wrap">
      <div className="h-full w-full lg:w-1/4 relative">
        <Search />
      </div>
      <div className="h-full w-full lg:w-3/4 relative">
        <Map />
      </div>
    </div>
  );
}
