import { Mongo } from 'meteor/mongo'
import { Tasks } from '../imports/api/tasks.js';

/*

	TODO: 
		- Put in environment variable for SendGrid into cronjob

	Steps: 
		- Get today's date
		- Grab each task from DB
			- Details to grab from each task:
				* deadline -- when the assignment is due
				* reminderVal -- digits from 1 to 31
				* reminderPeriod -- time period (hours, days, weeks) from when the assignment is due
		- Get current time
		- See if reminder falls in between reminder period and deadline for assignment
			- If yes, then send email to user
			- If no, then ignore the task
*/

if(Meteor.isServer){

	SyncedCron.start();

	SyncedCron.add({
		  name: 'Send emails',
		  schedule: function(parser) {
		    // parser is a later.parse object
		    return parser.text('every 24 hours');
		  },
		  job: function() {
		    emailCronjob();
		  }
	});
}

/*
	Cronjob that runs every 24 hours to check tasks in database.
	Sends email to user if deadline for task is approaching.
*/
function emailCronjob(){

	//Get all tasks from database
	let tasks = Tasks.find({}).fetch();

	//Get the time right now (used to calculate difference later)
	const now = new Date();

	//Number of milliseconds in 1 hour
	let msInOneHour = 1000 * 60 * 60; 

	//Go through each task and send an email reminder to the user as needed
	tasks.filter((task) => { 

		//Note: Month is stored from 0-11 not 1-12
		let deadline = new Date(task.deadline);
		
		//Get hours prior to deadline the user wants to be reminded
		let reminderHours = getHours(task);

		//Get difference between deadline and time right now
		let diff = (deadline.getTime() - now.getTime()) / msInOneHour;

		//If the difference is less than the remainderPeriod calculated, then alert user
		if(diff < reminderHours){
			sendEmail(task, deadline);
		}
	});
}

/*
	Given a task and its deadline, send user associated with the task an email

	@params:
		task: Task object containing fields such as owner, deadline etc.
		deadline: Date object for deadline
*/
function sendEmail(task, deadline){

	let ownerID = task.owner;

	let user = Meteor.users.findOne({ _id : ownerID });

	let subject = 'Assignment due soon!';

	//Make this sexy
	let body = task.assignment + ' is due at: ' + deadline.getDate()
			  				   + '/' + deadline.getMonth()
			  				   + '/' + deadline.getFullYear();

	//Format: Meteor.call(to, from, subject, text)
	//TODO: Put in email field for each user
	Meteor.call('sendEmail', 'homeworkplanner@gmail.com', 'todo@todo.com', subject, body);
}

/*
	Given a value and a period, calculate the number of hours prior to deadline that user would like to be 
	sent a reminder
	
	@params:
		reminderVal: {Integer} ranges from 0-29
		reminderPeriod: {String} "Hours", "Days", "Weeks", "Months" 
*/
function getHours(task){

	//User provided fields for each task 	
	let reminderVal = task.reminderVal;			//1,2,3....30
	let reminderPeriod = task.reminderPeriod;   //'Hours', 'Days', 'Weeks', 'Months'

	//Hours before deadline that user must be reminded
	let reminderHours = 1;

	//Determine the number of hours before deadline that reminder must be sent
	switch(reminderPeriod){
		case "Hours":
			reminderHours *= reminderVal;
			break;
		case "Days":
			reminderHours *= (24 * reminderVal); 			//24 * 1 hours = 1 day
			break;
		case "Weeks":
			reminderHours *= (24 * 7 * reminderVal); 		//24 * 7 * 1 hours = 1 week
			break;
		case "Months":
			reminderHours *= (24 * 7 * 30 * reminderVal); 	//24 * 7 * 30 ~= 1 month
			break;
	}

	return reminderHours;
}
