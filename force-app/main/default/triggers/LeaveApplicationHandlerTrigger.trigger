trigger LeaveApplicationHandlerTrigger on Leave__c (after insert) {
    if(trigger.isAfter && trigger.isInsert){
        LeaveApplicationHandler.sendLeaveRequestToManager(trigger.new);
    }
}