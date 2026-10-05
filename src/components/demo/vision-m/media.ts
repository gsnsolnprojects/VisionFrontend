/** Camera-feed crops of the two live recordings in /public/demo/vision-m. */
export const BLISTER_FEED = {
  src: "/demo/vision-m/blister-live.mp4",
  poster: "/demo/vision-m/card-cover.jpg",
  frame: { w: 992, h: 846 },
  crop: { x: 0.025, y: 0.09, w: 0.955, h: 0.62 },
  startAt: 2.6,
};
export const SEAT_FEED = {
  src: "/demo/vision-m/carseat-live.mp4",
  poster: "/demo/vision-m/seat-cover.jpg",
  frame: { w: 1110, h: 788 },
  crop: { x: 0.019, y: 0.11, w: 0.851, h: 0.765 },
};

export const scrollToId = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
