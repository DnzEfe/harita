using AutoMapper;
using turkiye_haritası.Models;
using turkiye_haritası.DTOs;
using NetTopologySuite.Geometries;

namespace turkiye_haritası.Mappings
{
    public class TesisProfile : Profile
    {
        public TesisProfile()
        {
            // 1. Veritabanından (Point) -> Haritaya (Enlem/Boylam Sayılarına)
            CreateMap<Tesis, TesisDTO>()
                .ForMember(dest => dest.Enlem, opt => opt.MapFrom(src => src.Konum != null ? src.Konum.Y : 0))
                .ForMember(dest => dest.Boylam, opt => opt.MapFrom(src => src.Konum != null ? src.Konum.X : 0));

            // 2. Haritadan (Enlem/Boylam Sayılarından) -> Veritabanına (Point'e)
            CreateMap<TesisDTO, Tesis>()
                .ForMember(dest => dest.Konum, opt => opt.MapFrom(src =>
                    new Point(src.Boylam, src.Enlem) { SRID = 4326 } // SRID 4326 = Dünya Koordinat Sistemi (WGS84)
                ));
        }
    }
}