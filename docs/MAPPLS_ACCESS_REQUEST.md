> **Superseded (18 Nov 2026 onward): PICKR now uses Google Maps Platform.** See [GOOGLE_MAPS_SETUP.md](GOOGLE_MAPS_SETUP.md). This file is kept only as history of the Mappls pilot.

# Mappls access request — PICKRcloud

Console path: Contact Us → Technical Support. Select Cloud Solutions for Product. The console currently displays 31 allocated cloud APIs but no self-service add/upgrade control was found in application Allocations, Edit, or account Settings.

Suggested request (not submitted):

We are testing PICKR, a construction-material truck booking and tracking pilot in Thrissur, Kerala. Our cloud application is PICKRcloud; our web application is PICKRweb.

Please confirm availability, required allocation names, and pricing before changing subscriptions for:

1. Place Details Location Coordinates. Our geocoding returns an eLoc; /O2O/entity/place-details/{eLoc} returns HTTP 200 with name/address/eLoc but no latitude or longitude. Please enable coordinate access or identify the supported coordinate-returning API for our allocation.
2. Routing API for Predictive ETA: /routev2/direction/route with profile=trucking and speedTypes=traffic/predictive. This endpoint currently returns HTTP 401. Please confirm measured height, width, length, gross weight and axle load support and Kerala coverage.
3. /route/direction/route_traffic/driving currently returns HTTP 401. We understand standard route_traffic does not support trucking; please identify the traffic-optimised routing option suitable for trucks.
4. Web Maps JS v3 responds HTTP 200 with the Android appassets.androidplatform.net origin, but HTTP 401 (IP/Domain validation failed) with http://localhost:3000 and http://192.168.0.123:3000 after adding host names to Whitelisting. Including ports and full HTTP origins did not resolve this. Please confirm supported local HTTP domain syntax or whether an HTTPS deployment is required.

Standard route_eta/driving and route_eta/trucking currently work. We will continue the pilot with current traffic ETA and manual site pins while advanced access is resolved. Please do not activate a paid plan without first sharing the terms and cost.

Do not include the API key in a public forum post. Use the application's identity within the authenticated support flow.
