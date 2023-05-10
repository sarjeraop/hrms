import { LightningElement,track} from 'lwc';
    import checkValidEmail from '@salesforce/apex/LeaveApplicationHandler.checkValidEmail';
    import getActiveOTP from '@salesforce/apex/LeaveApplicationHandler.getActiveOTP' 
    import getEmployeeLeaveSummary from '@salesforce/apex/LeaveApplicationHandler.getEmployeeLeaveSummary' 
    import getLeaveApplications from '@salesforce/apex/LeaveApplicationHandler.getLeaveApplications'
    import cancelLeave from '@salesforce/apex/LeaveApplicationHandler.cancelLeave'  
    import getWorkingDays from '@salesforce/apex/LeaveApplicationHandler.getWorkingDays'
    
       
    const actions = [
        { label: 'View', name: 'view' },
    ];
   
    const col = [
     
        { label: 'Application Name', fieldName: 'Name'},
        { label: 'Duration', fieldName:'Leave_Duration__c'},
        { label: 'Leave Date', fieldName:'Leave_Date__c'},
        { label: 'Type', fieldName: 'Leave_Type__c'},
        { label: 'Status', fieldName: 'Leave_Status__c'},
        { label: 'Reason', fieldName:'Leave_Reason__c'},
        { label: 'Category', fieldName:'Leave_Category__c'},
       
        {
            type: 'action',
        
            typeAttributes: { rowActions: actions },
        }
        ];

        const columns = [
            { label: 'Leave Date', fieldName: 'Leave_Date__c'},
            { label: 'Leave Type', fieldName: 'Leave_Type__c'},
            {label:'Reason',fieldName:'Leave_Reason__c'},
            {label:'Category',fieldName:'Leave_Category__c'},
            ];

    export default class EmployeeUtility extends LightningElement {
     

    @track email;
    @track otp;
    @track showOtpField=false;
    @track getOTP = true;
    @track showReadOnlyEmail = false;
    @track showEmailField = true;
    @track showPortal = false;
    @track showVerificationPage = true;
    @track leaveSummary = [];
    @track leaveBalance ;
    @track leaveCredited ;
    @track leavesDebited ;
    @track optionalHolidaysTaken;
    @track otpValue;
    @track gridColumns =col;
    @track data = [];
    @track tempData = [];
    @track dataToDisplay =[];
    @track showDashBoard = false;
    @track showModal = false
    @track showLeaveApplication = false
    @track leave = false
    @track leaveType
    @track leaveStatus
    @track leaveReason
    @track leaveDate
    @track showFooter=false;
    @track showViewAll = false;
    @track applyForLeave = false
    @track selectedLeaveType
    @track startDateValue
    @track endDateValue
    @track description
    @track leavesData = [];
    @track columns = columns;
    @track showAppliedLeaves = false
    @track showHalfDay = false
    @track halfDayType
    @track leaveApplicationStartDate
    @track leaveApplicationEndDate
    @track leaveApplicationDuration
    @track leaveApplicationName
    @track casualLeavesCredited
    @track optionalHolidaysCredited
    @track compOffLeavesCredited
    @track ShowLeavePortalImage=false;
    @track showSecondPage=false;
    @track myApprovals = false;

    get options() {
        return [
            { label: 'Optional Leave', value: 'Optional Leave' },
            { label: 'Comp Off', value: 'Comp Off' },
            { label: 'Half Day', value: 'Half Day' },
            { label: 'Casual Leave', value: 'Casual Leave' },
            ];
    } 
    get halfDayOptions() {
        return [
            { label: 'First Half', value: 'First Half' },
            { label: 'Second Half', value: 'Second Half' },
            ];
    } 

    

    handleEmail(){
      //  const emailRegex = [A-Za-z0-9._-]+"@deciphercloud.com"$

      let regex = new RegExp('[a-z0-9]+@deciphercloud'+'[.com]{4,}$');

    let emailValue = this.template.querySelector(".validateEmail").value; 
   // let emailPattern = this.template.querySelector(".validateEmail").pattern;
    let emailField = this.template.querySelector(".validateEmail");
    this.email=emailValue
    if(emailValue.match(regex)){
        console.log('inside regex');
        emailField.setCustomValidity("");
        emailField.reportValidity();
        
    checkValidEmail({ empEmail: this.email })
    .then((result) => {
        console.log('result=='+result)
        this.otp = result;
        console.log('inside result')
        
        //console.log('this.contactEmail=='+this.contactEmail)
    if(this.otp=='no email found'){    
            emailField.setCustomValidity("This email does not exist. Please enter the correct email or contact your admin team.");
            emailField.reportValidity();
        }else{
            this.showOtpField=true
            emailField.setCustomValidity("");
            emailField.reportValidity(); 
            this.getOTP = false;
            this.showOtpField = true;
            this.showReadOnlyEmail = true;
            this.showEmailField = false;
            this.showVerificationPage = false;
            this.showSecondPage=true;
        } 
    }).catch(error => {
        console.error('error',error);
        //console.log('otp error'+JSON.stringify(error));
    })

    }else{
        emailField.setCustomValidity("Please enter valid email address.. e.g. user.b@deciphercloud.com");
        emailField.reportValidity();
    }
    console.log('this.email=='+this.email)

    }
    handleOtpValidation(){
    console.log('email :'+this.email)
    console.log('OTP '+this.otp)
    getActiveOTP({employeeEmail : this.email , OTP:this.otp})
    .then(result => {
        this.otpValue = result;
        console.log('otp result= '+this.otpValue );
        console.log('type= '+typeof(this.otpValue));
        let otpField = this.template.querySelector(".validateOtp");
        
           // console.log('otpField value : ',otpField)
            if (otpField.value != this.otp) {
            otpField.setCustomValidity("Please enter the correct OTP sent to your email");
            otpField.reportValidity();
            
            } else {
                console.log('line 152')
                otpField.setCustomValidity(""); // clear previous value
                otpField.reportValidity();
                this.showVerificationPage = false;
                this.showSecondPage = false;
                this.ShowLeavePortalImage=true;
                this.showPortal=true;
                this.geInitialEmployeeSummary()
                this.handleDashboard()
                
            }
    })
    .catch(error => {
        console.error('error',error);
        //console.log('otp error'+JSON.stringify(error));
    })


    }

    geInitialEmployeeSummary(){
        getEmployeeLeaveSummary({emloyeeEmail: this.email})
        .then((result) => {
            console.log('leave summary '+result.Leave_Balance__c)
            this.leaveBalance = result.Leave_Balance__c;
            this.optionalHolidaysTaken = result.Optional_Holiday_Taken__c;
            this.leaveCredited = result.Leaves_Credited__c;
            this.casualLeavesCredited=result.Total_Credited_Leaves__c;
            this.optionalHolidaysCredited=result.Optional_Leaves_Credited__c;
            this.compOffLeavesCredited=result.Comp_Off_Leaves_Credited__c;
            this.leavesDebited = result.Total_Leaves_Approved__c;
            console.log('leave summary ',result)
         
        }).catch(error => {
            console.error('error',error);
			//console.log('otp error'+JSON.stringify(error));
		})
    }

    handleDashboard(){
       
        this.applyForLeave = false;
        this.showAppliedLeaves = false;
        this.showDashBoard = true;
        getLeaveApplications({emloyeeEmail: this.email})
        .then((result) => {

        for (var i=0; i<result.length; i++ ) {
            var child =  result[i]['Leaves__r'];
           
            result[i]._children = result[i]['Leaves__r'];
            
            delete result[i].Leaves__r; 
        }
        while (this.data.length > 0) {
            this.data.pop();
          }
            this.data = result;
            while (this.tempData.length > 0) {
                this.tempData.pop();
              }

             
            for(var i=0; i< this.data.length; i++ ){
                console.log('value of i '+i)
                   if(i<10){
                    this.tempData.push(this.data[i])
                    console.log('inside i<10 ')
                   }else{
                    this.showViewAll = true;
                    console.log('making viewAll true')
                   }
            }
           
                this.dataToDisplay = this.tempData
              
       
        
        
         console.log('this.dataToDisplay '+JSON.stringify(this.dataToDisplay))
         console.log('this.dataToDisplay ',this.dataToDisplay)
       // component.set('v.gridData', resultData);
        console.log('this.data '+this.data)
        console.log('this.data '+JSON.stringify(this.data))
        })
    
            this.leaveselectedLeaveType = null;
            this.halfDayType = null;
            this.startDateValue=null;
            this.endDateValue=null;
            this.description=null;
    }

    handleRowAction(event){
        const actionName = event.detail.action.name;
        const row = event.detail.row;
        console.log('row  :'+row)
        console.log('row Id :'+row.Id)
        console.log('typeof :'+typeof(row.Id))
      
        if(row.Id.startsWith('a01')){
            console.log('yes')
            console.log('row.Name '+row.Name)
            this.showModal = true
            this.leave = false
            this.showLeaveApplication = true
            this.leaveApplicationName = row.Name;
            console.log('this.leaveApplicationName '+row.Name);
            this.leaveApplicationStartDate = row.Start_Date__c;
            console.log('this.leaveApplicationStartDate '+row.Start_Date__c)
            this.leaveApplicationEndDate = row.End_Date__c;
            console.log(' this.leaveApplicationEndDate  '+row.End_Date__c);
            this.leaveApplicationDuration = row.Leave_Duration__c;
            console.log('this.leaveApplicationDuration '+row.Leave_Duration__c);

            
        }else{
            this.showLeaveApplication = false;
            this.leaveId = null
            this.leaveType = row.Leave_Type__c
            console.log('row.Leave_Type__c '+row.Leave_Type__c);
            this.leaveStatus = row.Leave_Status__c
            this.leaveId = row.Id;
            console.log('this.leaveId '+this.leaveId)
            if(this.leaveStatus == 'Pending For Approval'){
                this.showFooter = true;
            }else{
                this.showFooter = false;
            }
            this.leaveReason = row.Leave_Reason__c
            this.leaveDate = row.Leave_Date__c
            this.leave = true
            this.showModal = true
            console.log('no')
        }
       // this.handleDeleteRow(row.Id);
    }

    hideModalBox(){
        this.showModal  = false;
    }

    leaveCancel(){
        console.log('inside leavecacel')
        let leaveCancelReason = this.template.querySelector(".cancel");
        let leaveCancelReasonValue = this.template.querySelector(".cancel").value;
        if (!leaveCancelReasonValue) {
            leaveCancelReason.setCustomValidity("Please enter leave cancellation reason")
            leaveCancelReason.reportValidity()
        }else{
            leaveCancelReason.setCustomValidity("")
            leaveCancelReason.reportValidity()
            
            cancelLeave({leaveRecId:this.leaveId,cancellationReason:leaveCancelReasonValue})
            .then((result) => {
                this.showModal = false
               this. handleDashboard()
             
            }).catch(error => {
                console.error('error',error);
                //console.log('otp error'+JSON.stringify(error));
            })

        }
       
    }
    showAllRecords(){
        this.dataToDisplay = this.data
        this.showViewAll = false
    }
   
    handleApplyLeave(){
        this.applyForLeave = true
        this.showDashBoard=false;
    }
     
    handleChange(event) {
        this.leaveselectedLeaveType = event.detail.value;
        
            console.log('inside else of leaveselectedLeave')
            
            if(this.leaveselectedLeaveType=='Half Day'){
                this.showHalfDay = true;
                
            }else{
                this.showHalfDay = false;
                this.halfDayType = '';
            }
        

        

       
       
    }
    handleHalfDayType(event){
      this.halfDayType=event.detail.value;
    }

    handleLeaveApplication(){
        let desc = this.template.querySelector(".description")
        this.description=this.template.querySelector(".description").value;
        this.description = this.description.trim()
        if(this.description != undefined && this.description != '' && this.description != null){
            let leaveselectedLeave = this.template.querySelector(".leaveType");
        console.log(' this.leaveselectedLeaveType '+ this.leaveselectedLeaveType);
        console.log('this.optionalHolidaysTaken '+this.optionalHolidaysTaken);

        if(  this.leaveselectedLeaveType=='Optional Leave' && this.optionalHolidaysTaken >= 2){
    
            leaveselectedLeave.setCustomValidity("You have already availed all the optional holidays");
            leaveselectedLeave.reportValidity();
        }else{
            console.log('inside else of startrndDate')
            leaveselectedLeave.setCustomValidity("");
            leaveselectedLeave.reportValidity();
            let endDate = this.template.querySelector(".endtDate")
            let startDate = this.template.querySelector(".startDate")
            this.startDateValue = this.template.querySelector(".startDate").value;
            this.endDateValue = this.template.querySelector(".endtDate").value;

            var todaysDate=new Date();
            console.log('todays date : '+todaysDate);
            
         

            var date1=new Date(this.startDateValue);
            var date2=new Date(this.endDateValue);
           
            const diffTodayandStartDate = todaysDate - date1;
            const diffDaystodayandStartDate = Math.ceil(diffTodayandStartDate / (1000 * 60 * 60 * 24)); 
            console.log('diffTodayandStartDate :'+diffDaystodayandStartDate);
            if(diffDaystodayandStartDate > 30){
                startDate.setCustomValidity("Start date can not be less than 30 days than today");
                startDate.reportValidity();
            }else{
                startDate.setCustomValidity("");
                startDate.reportValidity();
                
            const diffTime = Math.abs(date2 - date1);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
            if(this.leaveselectedLeaveType=='Optional Leave' &&  diffDays >0){
                console.log('inside diffDays ')
                leaveselectedLeave.setCustomValidity("You can not apply for more than one optional holiday in a single leave application.");
                leaveselectedLeave.reportValidity();
            }else{
                leaveselectedLeave.setCustomValidity("");
                leaveselectedLeave.reportValidity();
                if(  this.endDateValue < this.startDateValue ){
                    endDate.setCustomValidity("End date can not be less than start date");
                    endDate.reportValidity();
                }else{
                    endDate.setCustomValidity("");
                    endDate.reportValidity();
                    this.description=this.template.querySelector(".description").value;
                    getWorkingDays({ startDate:  this.startDateValue , endDate:this.endDateValue , leaveType: this.leaveselectedLeaveType,description:this.description,empEmail:this.email,halfDayType:this.halfDayType,isInsert:false})
                    .then((result) => {
                        this.leavesData=result;
                        this.data.forEach(item => {
                            console.log('item keys :'+Object.keys(item))
                            console.log('item value '+item.Id)
                            this.detailIdList.push(item.Id)
                            console.log('this.detailIdList  '+this.detailIdList)
                        })
                       console.log(' this.data=='+ this.data)
                       console.log(' this.data stringify '+JSON.stringify( this.data))
                       console.log(' result obj '+result)
                       console.log('result stringi '+JSON.stringify(result))
                       console.log('result values '+Object.values(result))
                    }).catch(error => {
                        console.error('error',error);
                        //console.log('otp error'+JSON.stringify(error));
                    })
                   
                    this.applyForLeave = false;
                    this.showAppliedLeaves = true;
                 
            }
            }
            }    
        }
        }else{
            desc.setCustomValidity("Please enter description");
            desc.reportValidity();
        }
        
        
}
handleBack(){
    this.applyForLeave = true;
    this.showAppliedLeaves = false;
}

handleLeaveConfirmation(){
   

    getWorkingDays({ startDate: this.startDateValue , endDate:this.endDateValue , leaveType:this.leaveselectedLeaveType,description:this.description,empEmail:this.email,halfDayType:this.halfDayType,isInsert:true})
    .then((result) => {
      //  this.data=result;
      console.log('after getWorking days');
        this.handleDashboard(); 

    }).catch(error => {
        console.error('error',error);
        //console.log('otp error'+JSON.stringify(error));
    })
}


  

    }