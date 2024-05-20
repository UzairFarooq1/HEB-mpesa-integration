# For your understanding. 

We will use firebase and react for the intended project 
once you have cloned the repo do the following steps 
on the terminal run the following: - 
  1. npm i  or npm install 
  2. npm install firebase
  3. npm install -g firebase-tools

on the src go to the components section 
under the section depending on who would handle what, as for now we have 2 tasks either posting of events and the fetching of events. 
the firebaseConfig has the basic configurations to help start the project 
authentication has been done two emails work for authentication 

heb@test.com    password = test@321
heb@test.com    password = test@321

i also will add you to the firebase console. 


- just a heads up the following has been done 
- creation of the firebase console 
- i have linked it to the project and the same can be viewed on the main.jsx file and firebaseConfig.js file
- i have created rough skeleton pages for the login, signup caurosel, header, welcomePage, the login and signup have been connected to firebase for authentication. 
- Eventform will be for the creation of events and uploading them to firestore i started this a bit but did not finish. 

PS 
were using the following for styles either have a file inside the src/components/styles folder or use styled-components library to have the styles inside the same jsx file.

also if you choose to create a file inside the src/components/styles folder make sure if your working on a header.jsx component and your making the styles for the same name the styles by first starting with header- then the thing your making styles for. i.e. making styles for a button in the header we name it 'header-button'. 

" the reason for this is that by anychance sometimes the a component might pick styles that have matching names even when they arent imported."






