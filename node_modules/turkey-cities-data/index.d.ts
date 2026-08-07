export interface City {
  id: number;
  slug: string;
  label: string;
  plate: string;
  coord: {
    lat: number;
    lon: number;
  };
  region: {
    slug: string;
    label: string;
  };
  population: number;
}

declare const cities: City[] & {
  get: (slug: string) => City | null;
};

export default cities;
