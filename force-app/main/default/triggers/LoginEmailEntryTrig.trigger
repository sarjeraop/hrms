trigger LoginEmailEntryTrig on Login_Email_Entry__c (after insert) {
    if(trigger.isAfter && trigger.isInsert){
        LeaveApplicationHandler.sendOtpEmail(trigger.new);  
    }
}