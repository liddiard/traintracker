# About TrainTracker

TrainTracker aims to be the best way to browse and get updates on Amtrak, VIA Rail, and Brightline trains. I created it after moving to the US Northeast, where Amtrak is often a competitive alternative to flying or driving.

It’s no secret that North American passenger rail lags behind much of Europe and Asia. The coverage, speed, and general user experience can leave something to be desired. I can’t do much to fix that myself, but as a software engineer and transit enthusiast, I can at least make the tracking of train journeys a bit less painful.

I’ve long enjoyed sites that track other types of transportation with live maps and took inspiration from apps like [Flightradar24](https://www.flightradar24.com/) and [MarineTraffic](https://www.marinetraffic.com). The interactive map is the focal point, paired with train search and an in-depth timeline view. Using the web [Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API), TrainTracker can alert you when a train arrives at or departs a station.

Unlike other rail trackers, TrainTracker also estimates trains’ locations in real time using a combination of last-reported GPS coordinates and timetable in an effort to provide the most up-to-date information.

I’d like to acknowledge a few other sites in this space. They all have their strengths; they just didn’t quite provide everything I was looking for in a rail tracker. These include:

- [RailRat](https://railrat.net/)
- [Amtraker](https://amtraker.com/)
- [trains.fyi](https://trains.fyi/)
- [transitdocs.com](https://asm.transitdocs.com/)
- Amtrak’s official [Track Your Train Map](https://www.amtrak.com/track-your-train)

## FAQ

### Where does TrainTracker get its data?

**Amtrak** live train data comes from Amtrak’s undocumented and obfuscated API, which powers their [Track Your Train Map](https://www.amtrak.com/track-your-train). Despite being funded by taxpayers, Amtrak apparently thought it was a good idea to hide its train information from the public.

Enterprising [people have figured out](https://suddenlygreg.com/blog/2023-11-02-amtrak-api/) how to decrypt this data. For the record, if you understand how encryption works, you’ll immediately see that there’s nothing nefarious going on here. It’s not possible to obscure something when you make the decryption keys public.

**VIA Rail** train data comes from [a JSON file](https://tsimobile.viarail.ca/data/allData.json) hosted on their site.

**Brightline** provides realtime updates in the industry-standard GTFS format, which TrainTracker uses [from their site](http://feed.gobrightline.com/).

TrainTracker follows responsible caching practices to ensure it doesn’t impose a traffic burden on these upstream data providers.

### Why doesn’t TrainTracker support other transit agencies?

TrainTracker focuses on intercity rail because it’s one use case that routing apps like Google Maps don’t handle very well: They don’t show you trains’ current locations. They don’t communicate delays effectively. They don’t let you browse routes and stations. They don’t let you receive notifications about trains’ station arrivals and departures.

On the other hand, apps like Google Maps, [CityMapper](https://citymapper.com/), and [Transit](https://transitapp.com/) excel at planning city and metro area trips on transit like commuter rail and subways. These apps need to solve routing problems, handle multiple forms of transit, and time transfers. There’s a lot more complexity, and it’s already a pretty well-served space.

Simply put, TrainTracker shines in longer-distance rail travel and isn’t looking to compete on local transit.

As for geographic scope, TrainTracker is focused on North America because unlike many European and Asian markets, it doesn’t have particularly good offical transit apps doing the sort of thing TrainTracker does. Candidly, it’s also because it’s where I live. I’m open to expanding TrainTracker to other regions, but it’s not a current priority.

### Why are TrainTracker’s train locations wrong sometimes?

TrainTracker uses a combination of last-reported GPS location and station ETAs to estimate trains’ real-time positions. By necessity, this is somewhat optimistic. For example, we may have last received a GPS position from a train 5 minutes ago. Based on its estimated arrival time at the next station, we _assume_ it’s continued to move along the track and show an estimated current position. It’s an informed guess, but ultimately it is a guess, so sometimes it’s wrong.

When you select a train on the map, TrainTracker shows a rotating crosshair that indicates that train’s last-reported position. You can compare this with the train’s arrow icon which shows the extrapolated current position.

I believe there are some heuristics that could yield better extrapolations, and it’s one of the potential feature improvements listed below.

### What features does TrainTracker plan to add?

See TrainTracker’s [GitHub issues](https://github.com/liddiard/traintracker/issues) for the most up-to-date list of features that are planned or under consideration, subject to my time and project funding – i.e. no promises. Some notable ones include:

- Mobile apps for iOS and Android
- French and Spanish language support
- Storing and visualizing train historical data – such as to give a heads up that a particular train is often delayed, and to show if a route’s delays are worsening or improving
- Better train position extrapolation – such as accounting for acceleration/deceleration, top speed, and trains that appear to be stopped for an extended period

### How can I support TrainTracker?

TrainTracker is entirely volunteer-built by me in my spare time. It actually loses money right now from domain registration and web hosting costs. If you find TrainTracker useful and can afford it, I’d [love a donation](https://ko-fi.com/liddiard) to keep it chugging along (had to get in a train pun!) and free for everyone.

Another way to support is buying a product I recommend through the train travel [Gear Guide](/gear-guide). I receive a small commission on sales via the [Amazon Associates](https://affiliate-program.amazon.com/) program. This doesn't cost you anything more than what the product normally costs on Amazon.
