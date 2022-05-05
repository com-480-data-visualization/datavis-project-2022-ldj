## Project Goal
- The goal of this project is to aggregate certain COVID-19 information in the US into easily understandable visualizations that demonstrate trends and insights. Through exploring our visualizations, the users will directly see the progress of the pandemic in each state and how they compare to each other. Moreover, we also aim to create some visualizations that show the effectiveness of COVID protection measures including vaccination. To achieve this goal, we will break it down into independent pieces to be implemented as follows. 

## Core Visualization
### 1.Interactive Map
<p align="center">
  <img alt="Light" src="https://github.com/YinghuiJiang/datavis-project-2022-ldj/blob/main/sketches/initial.png"  width="45%">
&nbsp; &nbsp; &nbsp; &nbsp;
  <img alt="Dark" src="https://github.com/YinghuiJiang/datavis-project-2022-ldj/blob/main/sketches/selectAState.png" width="45%">
</p>

- For the core visualization, we will include a US state map and two line graphs. In its initial form, the map displays the relative amount of either the new deaths or vaccination among each state within a period of time, represented by an intuitive color scale(e.g. red for death and green for vaccination). The two line graphs show the trend of total death and vaccination of the US within the same time period. The users can freely adjust the time slider at the bottom to see how the COVID data changes with respect to time, as the map would dynamically change color and the line graphs would update its time range. 
- The user can take a closer look at each state by clicking on that state or using navigational search on the top. In this case, the two line graphs will become the trend of death and vaccination of that specific state. In this case, the map will only highlight the chosen state. Again, the user is free to change the time range and see the graphs in a broader or narrower view.

## Extra Visualizations
### 2. Linked Plots
<p align="center">
  <img alt="Light" src="https://github.com/YinghuiJiang/datavis-project-2022-ldj/blob/main/sketches/Vaxed%20vs.%20Unvaxed%20Death.png" width="60%">
</p>

- This visualization aims to show the effectiveness of vaccines. Specifically, the line graph on the right shows the death trend in the US categorized by vaccination status. Through adjusting the time slider, the user can directly visualize the differences between each category in the left bar graph, which showcases the percentage of each category in the total death at a specific time.

### 3.Ranking Bar Plot 
<p align="center">
  <img alt="Light" src="https://github.com/YinghuiJiang/datavis-project-2022-ldj/blob/main/sketches/statesranking.PNG" width="60%">
</p>
                                                                                                                   
- This visualization demonstrates the state level ranking of death and vaccination per day.The left would be death ranking and the right part would be vaccination ranking. Through adjusting the time slider, the user can directly explore daily ranking.

## Independent pieces to implement
- Map visualization overview
- Line plots of deaths and vaccination 
- Brushes to filter by date
- Navigational search (drop-down menu) to select a state
- Plots for vaccination effectiveness
- Bar plots for state ranking 

## Tools
- ***D3.js***, ***Leaflet***, ***GeoJson*** for Interactive map 
- ***D3-brush***, ***D3-zoom*** for the time slider
- ***Chart.js*** for bar plot

## Lectures
First, the whole project relies on lectures on HTML,CSS, Javascript and D3.js to structure the website, as well as lectures on designing visualization and story-telling for the design draft.
More importantly, lectures on Maps and interaction would be most significant for our core mapping visualizations. We also need lectures on perception colors, marks and channels for specific details.

## Add-on
- A possible add-on would be a 3d globe projection to plane when loading our core map.
- We may also add some animations for interation on website for users to explore.

