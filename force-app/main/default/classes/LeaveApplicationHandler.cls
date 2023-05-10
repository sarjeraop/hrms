public without sharing class LeaveApplicationHandler {
    public static string employeeId;
    public static string managerEmail;
    
    public static string leaveDescription;
    public static string userId;
    public static string yearlyLeaveRecId;
    public static string leaveAccountId;
    public static list<leave__c> leaveDetails = new list<leave__c>();
    public static decimal leaveCounter = 0;
    public static decimal yearlyLeaveBalance = 0;
    public static string typeOfLeave;
    public static string halfDay;
     
    
    @AuraEnabled
    public static String checkValidEmail(String empEmail){
        
        
        system.debug('empEmail=='+empEmail);
        Integer otpcode;
        String returnOtpValue;
        empEmail=empEmail.trim();
        
        List<contact> employeelist = [SELECT Id,Email,Name from contact where Email=:empEmail LIMIT 1];
        
        // system.debug('conlist=='+employeelist.size()); 
        
        if( employeelist.size()>0 && employeelist[0].Email !='' ){
            employeeId=employeelist[0].Id;
           otpcode = Math.round((Math.random() * (900000) + 100000));
            system.debug('otpcode=='+otpcode);
            
            returnOtpValue = String.valueOf(otpcode);
            system.debug('returnOtpValue=='+returnOtpValue);
            
            Login_Email_Entry__c emailEntry = new Login_Email_Entry__c();
            emailEntry.Employee_Name__c  = employeelist[0].Name;
            // emailEntry.Last_Name__c      = 'ganesh new';
            emailEntry.Email_Status__c   = 'New';
            emailEntry.Employee_Email__c = empEmail;
            emailEntry.OTP__c            = returnOtpValue;
            emailEntry.Is_Active__c = true;
            insert emailEntry;
            
            system.debug('emailEntry = '+emailEntry);
            
            
            
        }else{
            returnOtpValue = 'no email found';
        }
        
        return  returnOtpValue;
    }
    
    @AuraEnabled
    public static string getActiveOTP(string employeeEmail,string OTP){
        system.debug('emloyee Email :'+employeeEmail);
        system.debug('OTP '+OTP);
        Login_Email_Entry__c loginEntry = [Select Id,OTP__c,Employee_Email__c,Is_Active__c from Login_Email_Entry__c where Employee_Email__c=:employeeEmail ORDER BY CreatedDate DESC LIMIT 1];
        String OTPValue;
        system.debug('loginEntry = '+loginEntry.Is_Active__c);
        
        if(loginEntry != null){
            
             if(loginEntry.Is_Active__c == true && loginEntry.OTP__c == OTP){
            OTPValue = loginEntry.OTP__c;
        }
        else if(loginEntry.Is_Active__c == true && loginEntry.OTP__c != OTP ){
            OTPValue = 'Please Enter Correct OTP Sent To Your Email Address';
        }
        system.debug('otpValue '+OTPValue);
       
        }
        return OTPValue;
    }
    
    public static void sendOtpEmail (list<Login_Email_Entry__c> logInEmailEntries){
        
        List< Messaging.SingleEmailMessage> otpEmailList=new List< Messaging.SingleEmailMessage>();
        Messaging.SingleEmailMessage msg=new Messaging.SingleEmailMessage();
        string employeeEmail = logInEmailEntries[0].Employee_Email__c;
        system.debug('employeeEmail '+employeeEmail);
        String[] toAdd=new String[]{employeeEmail};
            
        EmailTemplate emailTemplate = [select Id, Subject, HtmlValue, Body from EmailTemplate where DeveloperName = 'OTP_Template' limit 1];
        system.debug('emailTemplate :'+emailTemplate);
        msg.templateid = emailTemplate.Id;    
        msg.SetToAddresses(toAdd);
        msg.setSubject('OTP Verification Email');
        String htmlBody = emailTemplate.HtmlValue;
        system.debug('hrmlbody '+htmlBody );
        htmlBody = htmlBody.replace('{EmployeeName}',logInEmailEntries[0].Employee_Name__c);
        htmlBody = htmlBody.replace('{OTP}',logInEmailEntries[0].OTP__c );
        htmlBody.replaceAll('\n', '<br/>');
        msg.setHtmlBody(htmlBody);
        otpEmailList.add(msg);
        Messaging.sendEmail(otpEmailList);
        
    }
    
    @AuraEnabled 
    public static Leave_Account__c getEmployeeLeaveSummary(String emloyeeEmail){
        Date dt=system.today();
        Integer year=dt.year();
        Leave_Account__c leaveAccount = [Select Leave_Balance__c,Optional_Holiday_Taken__c,Comp_Off_Leaves_Taken__c,Comp_Off_Leaves_Credited__c,Optional_Leaves_Credited__c,
                                         Leaves_Credited__c,Total_Credited_Leaves__c,Total_Debited_Leaves__c,Total_Leaves_Approved__c 
                                         FROM Leave_Account__c 
                                         WHERE  CALENDAR_YEAR(Leave_Account_Start_Date__c)=:YEAR AND Employee_Name__r.Email=:emloyeeEmail LIMIT 1];
        return leaveAccount;
    }  
    
    @AuraEnabled
    public static list<Leave_Application__c> getLeaveApplications(string emloyeeEmail){
        List<Leave_Application__c> leaveApplications = new List<Leave_Application__c>();
        leaveApplications = [SELECT Name,Start_Date__c, End_Date__c,Leave_Duration__c,
                             (SELECT 	Leave_Type__c, Leave_Category__c,Leave_Reason__c,Leave_Date__c, Leave_Status__c FROM Leaves__r)
                             FROM Leave_Application__c where Leave_Account__r.Employee_Name__r.Email=:emloyeeEmail order by createdDate DESC];
        system.debug('leaveApplications '+leaveApplications);
        return leaveApplications;
    } 
    
    @AuraEnabled
    public static void cancelLeave(Id leaveRecId,string cancellationReason){
        Leave__c leave = [select Id,Leave_Status__c from Leave__c where Id=:leaveRecId];
        leave.Leave_Status__c = 'Cancelled';
        leave.Leave_Cancellation_Reason__c=cancellationReason;
        update leave;
    }
    
    @AuraEnabled
    public  static list<leave__c> getWorkingDays(Date startDate, Date endDate ,String leaveType,String description,String empEmail,string halfDayType, Boolean isInsert){
        typeOfLeave = leaveType;
        halfDay = halfDayType;
       
        
        Contact employee = [SELECT Id, email from contact where email =:empEmail LIMIT 1];
        
        system.debug('employee '+employee);
        employeeId = employee.Id;
        
        leaveDescription = description;
        
        
        system.debug('startDate:=='+startDate);
        system.debug('enddate:=='+endDate);
        Set<Date> holidaysSet = new Set<Date>();
        for(Holiday offDay : [SELECT Id,Name,ActivityDate From Holiday])
        {
            holidaysSet.add(offDay.ActivityDate);
        }
        Integer workingDays = 0;
        for(integer i=0; i <= startDate.daysBetween(endDate); i++)
        {
            Date dt = startDate + i;
            DateTime currentDate = DateTime.newInstance(dt.year(), dt.month(),
                                                        dt.day());
            
            String todayDay = currentDate.format('EEEE');
            if(todayDay != 'Saturday' && todayDay !='Sunday' && (!holidaysSet.contains(dt)))
            {  
                
                getLeaveAccountRecord(dt,employee.Id);
            }
        }
        
        System.debug('--Working days'+workingDays);
        if(isInsert == true){
            
            list<Leave_Account__c> yeaerlyLeaveRec = [SELECT Id,Employee_Name__c,Leave_Account_End_Date__c,Leave_Account_Start_Date__c from Leave_Account__c 
                                                  where  Employee_Name__c =: employeeId ];
        
            
            list<Leave__c> leavesToBeInserted = new list<Leave__c>();
            if(startDate.year() !=endDate.year()){
                for(integer counter=0; counter<=1 ; counter++){
                    if(counter==0){
                        Leave_Application__c firstLeaveApplication = new Leave_Application__c();
                        for(Leave_Account__c leaveAccount:yeaerlyLeaveRec){
                            if(leaveAccount.Leave_Account_Start_Date__c.year()==startDate.year()){
                               firstLeaveApplication.Leave_Account__c = leaveAccount.Id;
                            }
                        }
                        firstLeaveApplication.Start_Date__c =startDate;
                        firstLeaveApplication.End_Date__c =Date.newInstance(startDate.year(), 12, 31);
                        insert firstLeaveApplication;
                        for(Leave__c leave :leaveDetails){
                            if(leave.Leave_Date__c.year()==startDate.year()){
                               
                               leave.Leave_Application__c = firstLeaveApplication.Id;
                                
                            }
                            leavesToBeInserted.add(leave);
                        }
                        system.debug('counter ');  
                    }else if(counter==1){
                        Leave_Application__c firstLeaveApplication = new Leave_Application__c();
                        for(Leave_Account__c leaveAccount:yeaerlyLeaveRec){
                            if(leaveAccount.Leave_Account_Start_Date__c.year()==startDate.year()){
                               firstLeaveApplication.Leave_Account__c = leaveAccount.Id;
                            }
                        }
                        firstLeaveApplication.Leave_Account__c = leaveAccountId;
                        firstLeaveApplication.Start_Date__c=Date.newInstance(endDate.year(), 1, 1);
                        firstLeaveApplication.End_Date__c=endDate;
                        insert firstLeaveApplication;
                        for(Leave__c leave :leaveDetails){
                            if(leave.Leave_Date__c.year()==endDate.year()){
                                 
                                leave.Leave_Application__c = firstLeaveApplication.Id;
                                    
                            }
                            leavesToBeInserted.add(leave);
                        }
                        
                    }
                    
                } 
                  system.debug('before insert leavesToBeInserted'+leavesToBeInserted);
             //   insert leaveDetails;
            }else{
                system.debug('inside isinsert');
                Leave_Application__c La = new Leave_Application__c();
                La.Leave_Account__c = leaveAccountId;
                La.Start_Date__c =startDate;
                La.End_Date__c =endDate;
                insert La;
              
                for(Leave__c leave :leaveDetails){
                    leave.Leave_Application__c = La.Id;
                  //  leavesToBeInserted.add(leave);
                }
                system.debug('before insert leaveDetails');
               // insert leaveDetails;
            }
            
            insert leaveDetails;
           
            system.debug('leaveDetails after inserting');
          
            return leaveDetails;
        }
        else{
          
            
            return leaveDetails;
        }
        
        
    }
    public static  void getLeaveAccountRecord(Date startDate,Id employeeId)
    {
        integer year = startDate.year();
        list<Leave_Account__c> yeaerlyLeaveRec = [SELECT Id,Employee_Name__c,Comp_Off_Leaves_Taken__c,Leave_Account_End_Date__c,Leave_Account_Start_Date__c,Leave_Balance__c,Optional_Holiday_Taken__c from Leave_Account__c 
                                                  where  Employee_Name__c =: employeeId AND CALENDAR_YEAR(Leave_Account_Start_Date__c) =: startDate.year() LIMIT 1];
        
        system.debug('yeaerlyLeaveRec '+yeaerlyLeaveRec);
        system.debug('(yeaerlyLeaveRec.size() '+yeaerlyLeaveRec.size());
        if(yeaerlyLeaveRec.size()==0){
            Date leaveAccountstartDate = Date.newInstance(startDate.year(), 1, 1);
            Date leaveAccountendDate=Date.newInstance(startDate.year(), 12, 31);
            Leave_Account__c leaveAccount = new Leave_Account__c();
            leaveAccount.Employee_Name__c = employeeId;
            leaveAccount.Leave_Account_End_Date__c =leaveAccountendDate;
            leaveAccount.Leave_Account_Start_Date__c =leaveAccountstartDate;   
            
            system.debug('leaveAccount creation '+leaveAccount);                    
            insert leaveAccount;
            leaveAccountId = leaveAccount.Id;
            yearlyLeaveRecId = leaveAccount.Id;
        }
        
        else{
            system.debug('yeaerlyLeaveRec '+yeaerlyLeaveRec);
            yearlyLeaveBalance =  yeaerlyLeaveRec[0].Leave_Balance__c;
            leaveAccountId =  yeaerlyLeaveRec[0].Id;
            yearlyLeaveRecId = yeaerlyLeaveRec[0].Id;
            
        }
        
        createLeavesRec(leaveDescription,leaveAccountId,startDate,typeOfLeave);
        
        
    }
    public static void createLeavesRec(String Description,Id leaveId,Date currDate,String leaveType)
    {
        system.debug('leaveType leaveType '+leaveType);
        Id recordTypeId=[select Id,Name from RecordType where sObjectType='Leave__c' and Name='Debited'].Id;
        if(leaveType=='Half Day'){
            leaveCounter = leaveCounter+0.5;  
        }else{
            leaveCounter = leaveCounter+1;  
        }	
        leave__c leaveDetailRec = new leave__c();
        system.debug('employeeId=='+employeeId);
        leaveDetailRec.Employee__c=employeeId;
        
        if(halfDay!='' ||halfDay!=null){
            leaveDetailRec.Half_Day__c= halfDay;
        }
        leaveDetailRec.Leave_Status__c='Pending For Approval';
        leaveDetailRec.Leave_Date__c=currDate;
        leaveDetailRec.RecordTypeId=recordTypeId;
        leaveDetailRec.Leave_Type__c = leaveType;
        // leaveDetailRec.Manager_Email__c =managerEmail;
        if(leaveCounter <= yearlyLeaveBalance){
            leaveDetailRec.Leave_Category__c = 'Paid Leave';
        }
        else{
            leaveDetailRec.Leave_Category__c ='Leave Without Pay';
        }
        if(leaveType =='Optional Leave'){
            leaveDetailRec.Leave_Category__c = 'Paid Leave';
        }
        system.debug('leaveDetailRec.Leave_Category__c '+leaveDetailRec.Leave_Category__c);
        leaveDetailRec.Leave_Reason__c=Description;
        
        system.debug('leaveId==**'+leaveId);
        
        leaveDetails.add(leaveDetailRec);
        //insert leaveRec;
        
        
    }  
    public static void sendLeaveRequestToManager(list<leave__c>leaveDetails){
        
        List<leave__c> leaves=[select Id, Leave_Reason__c,Leave_Type__c,Employee__c,recordType.Name from leave__c where Id=:leaveDetails];
        if(leaves[0].recordType.Name == 'Debited'){
          system.debug('@@ recrordType  :'+leaves[0].recordType.Name);

            Leave_Application__c leaveApplication = [select Id,Leave_Duration__c from Leave_Application__c where Id=:leaveDetails[0].Leave_Application__c LIMIT 1]; 
       
        string leaveDuration=string.valueOf(leaveApplication.Leave_Duration__c);
        
        Contact con =[SELECT Id,Email,ReportsTo.Email,ReportsTo.Name,Name from contact where Id=:leaveDetails[0].Employee__c LIMIT 1];
         
        
       string managerEmail = string.isNotBlank(con.ReportsTo.Email)?con.ReportsTo.Email:'' ;
       
        system.debug('@@ managerEmail :'+managerEmail);
        system.debug('@@ managerName :'+ con.ReportsTo.Name);
        
        List< Messaging.SingleEmailMessage>emailToManager=new List< Messaging.SingleEmailMessage>();
        Messaging.SingleEmailMessage msg=new Messaging.SingleEmailMessage();
        String[] toAdd=new String[]{managerEmail};
           // String[] ccAddresses=new String[]{'ganesh.b@deciphercloud.com','nikita.p@deciphercloud.com'};
                //  String[] toAdd=new String[]{'purushottam@deciphercloud.com'};
                EmailTemplate emailTemplate = [select Id, Subject, HtmlValue, Body from EmailTemplate where DeveloperName = 'Leave_Application_For_Manager' limit 1];
        msg.templateid = emailTemplate.Id;    
        msg.SetToAddresses(toAdd);
        //msg.setCcAddresses(ccAddresses);
        msg.setSubject('Leave Request');
        String htmlBody = emailTemplate.HtmlValue;
        system.debug('hrmlbody '+htmlBody );
        htmlBody = htmlBody.replace('{Manager}', con.ReportsTo.Name);
        htmlBody = htmlBody.replace('{EmployeeName}',con.Name);
        htmlBody = htmlBody.replace('{Employee}', con.Name);
        htmlBody = htmlBody.replace('{leaveType}',leaveDetails[0].leave_type__c );
        htmlBody = htmlBody.replace('{leaveDuration}',string.valueof(leaveDetails.size()));
        htmlBody = htmlBody.replace('{leaveReason}',leaveDetails[0].Leave_Reason__c);
        
        
        htmlBody.replaceAll('\n', '<br/>');
        String URL = 'https://deciphercloudinfosolutionsprivatel--mgmntapp.sandbox.lightning.force.com/lightning/r/Leave_Application__c/'+leaveDetails[0].Leave_Application__c+'/view';
        htmlBody = htmlBody.replace('{recId}',leaveDetails[0].Leave_Application__c);
        system.debug('URL:'+URL);
        
        msg.setHtmlBody(htmlBody);
        htmlBody = htmlBody.replace('{ClickHere}', URL);
        system.debug('****EmailBody:'+htmlBody);
        emailToManager.add(msg);
        Messaging.sendEmail(emailToManager);  
        
        }
        
        
    }
    @AuraEnabled(cacheable=true)
    public static list<Leave_Application__c> getLeaveApplicationsForManager(){
        List<Leave__c> pendingLeaves=[SELECT Id,Leave_Application__c,Leave_Status__c from Leave__c 
                                      where Leave_Status__c = 'Pending For Approval'];
        Set<Id> leaveApplicationIds = new Set<Id> ();
        for(Leave__c leave:pendingLeaves){
            leaveApplicationIds.add(leave.Leave_Application__c);
        }
        List<Leave_Application__c> leaveApplications=[SELECT Name,Start_Date__c, End_Date__c,Leave_Duration__c,Leave_Account__r.Employee_Name__r.Name,Leave_Account__r.Employee_Name__r.Job_Role__c,Leave_Account__r.Leave_Balance__c,
                                                      (SELECT Leave_Type__c, Leave_Category__c,Leave_Reason__c,Leave_Date__c, Leave_Status__c FROM Leaves__r WHERE Leave_Status__c = 'Pending For Approval')
                                                      FROM Leave_Application__c where Leave_Account__r.Employee_Name__r.Reporting_Manager__c=:userinfo.getuserId() ];
        
        system.debug('leaveApplications for manager'+leaveApplications);
        return leaveApplications;
    }
    
    @AuraEnabled
    public static void saveApprovedLeaves(List<String> leaveIdList,String status,String managerComments){
        try {
           
            Schema.DescribeSObjectResult r = Leave__c.sObjectType.getDescribe();
            String keyPrefix = r.getKeyPrefix();
            system.debug('keyPrefix :'+ keyPrefix);
            /*Integer index;
for(Integer i=0;i < leaveIdList.size();i++){
if(leaveIdList[i].substring(0, 2) != keyPrefix)
{   //index = leaveIdList.indexOf(leaveIdList[i]);
leaveIdList.remove(i);
// i=i-1;
}
}*/
            System.debug('leaveIdList : '+ leaveIdList);
            List<Leave__c> leaveList = [Select id,Leave_Status__c,Manager_Comments__c from Leave__c where id in :leaveIdList];
            system.debug('leaveList count :'+leaveList.size());
            for(Leave__c l : leaveList ){
                l.Leave_Status__c = status;
                l.Manager_Comments__c = managerComments;
            }
            system.debug('Updated List :'+leaveList);
            update leaveList;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Leave_Application__c> getApplicationsByManagerDepartment(){
        List<Leave_Application__c> laList = new List<Leave_Application__c>();
        /*String ManagerSFId = UserInfo.getUserId();
        //String ManagerContactIdId = '';
        //Map<String,Manager_Contact_Mapping__mdt> mcMappingMap = Manager_Contact_Mapping__mdt.getAll();
        //system.debug('ManagerSFId :'+ManagerSFId);
        //system.debug('mcMappingMap :'+mcMappingMap);
        for(String mdtId : mcMappingMap.keySet()){
            if(mcMappingMap.get(mdtId).Manager_UserId__c == ManagerSFId){
                ManagerContactIdId = mcMappingMap.get(mdtId).Manager_Contact_Record_Id__c;
                break;
            }
        }
        system.debug('ManagerContactIdId: '+ManagerContactIdId);
        String managerDepartment = [Select Department__c From Contact where id =:ManagerContactIdId limit 1].Department__c;
        system.debug('managerDepartment :'+managerDepartment);*/
        //if(ManagerContactIdId != ''){
            laList = [SELECT Name, Id, Start_Date__c, End_Date__c, Approved_Leaves__c, Leave_Duration__c,Leave_Account__r.Employee_Name__r.Job_Role__c,Leave_Account__r.Leave_Balance__c,
                      Leave_Account__r.Employee_Name__r.Name,
                      (SELECT Id, Leave_Date__c, Leave_Type__c,Leave_Category__c, Leave_Reason__c, Leave_Status__c
                      FROM Leaves__r Where Leave_Status__c = 'Pending For Approval' order by Leave_Date__c asc)
                      FROM Leave_Application__c order by Start_Date__c];
                      //Where Leave_Account__r.Employee_Name__r.Department__c  =: managerDepartment 
       // }
        
        system.debug('laList: '+laList[0].Leaves__r);
        
        return laList;
    }
     
  /*  @AuraEnabled
    public static string isManager(string emailOfEmployee)
    {
        string isEmpManager='';
        system.debug('emailOfEmployee: '+emailOfEmployee);
        contact query = [SELECT Email, isManager__c from contact where Email =: emailOfEmployee ];
        system.debug('query.isManager__c '+query.isManager__c);
        if(query.isManager__c==true){
            isEmpManager='true';
        }else{
           isEmpManager='false'; 
        }
       
        Return isEmpManager;
        
    } */
}