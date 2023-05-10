import { LightningElement, wire,track } from 'lwc';
//import LightningModal from 'lightning/modal';
import getLeaveApplicationsForManager from '@salesforce/apex/LeaveApplicationHandler.getApplicationsByManagerDepartment';
import updateLeaves from '@salesforce/apex/LeaveApplicationHandler.saveApprovedLeaves';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
const col = [
  { label: 'Employee Name', fieldName: 'EmpName',initialWidth : 200}, 
 // { label: 'Leave No', fieldName: 'Name'}, 
 // { label: 'Job Role', fieldName:'JobRole'}, 
  { label: 'Start Date', fieldName: 'Start_Date__c',initialWidth : 100},
  { label: 'End Date', fieldName: 'End_Date__c',initialWidth : 100},
  { label: 'Leave Balance', fieldName: 'LeaveBalance',initialWidth : 100},
  { label: 'Duration', fieldName:'Leave_Duration__c',initialWidth : 100},
  { label: 'Date', fieldName: 'Leave_Date__c',initialWidth : 90},
  { label: 'Category', fieldName:'Leave_Category__c'},
  { label: 'Type', fieldName: 'Leave_Type__c',initialWidth : 100},
  
  { label: 'Reason', fieldName:'Leave_Reason__c',initialWidth : 300},
 // { label: 'Category', fieldName:'Leave_Category__c'}
  ];

export default class ManagerUtility extends LightningElement {
  @track isShowModal = false;
  @track comments;
  @track refreshTable;
  @track dataToDisplay;
  @track gridColumns=col;
  @track idList=[];
  @track selectedRows = [];
  @track currentSelectedRows =[];
  @track status;
  @track projectListObj;  // the data as returned by the apex wire service
  @track projectList;  // wire service data required modification for correct display
    @wire
    (getLeaveApplicationsForManager)
    pendingLeaveApplications(result) {
        this.refreshTable = result
            if (result.data) {
                console.log('result.data '+JSON.stringify(result.data))
                console.log('result ',JSON.stringify(result))
                
                let parseData = JSON.parse(JSON.stringify(result.data));
                for (let i = 0; i < parseData.length; i++) {
                  
                  parseData[i].EmpName = parseData[i]["Leave_Account__r"]["Employee_Name__r"]["Name"] + ' (' + parseData[i]["Leave_Account__r"]["Employee_Name__r"]["Job_Role__c"] + ')' ;
                  //parseData[i].JobRole = parseData[i]["Leave_Account__r"]["Employee_Name__r"]["Job_Role__c"];
                  parseData[i].LeaveBalance = parseData[i]["Leave_Account__r"]["Leave_Balance__c"];
                  parseData[i]._children = parseData[i]["Leaves__r"];
                  console.log('parseData[i]["Leaves__r"].length : '+JSON.stringify(parseData[i]["Leaves__r"]));
                  
                  console.log('parseData[i] :'+JSON.stringify(parseData[i]))
                  
                  if(JSON.stringify(parseData[i]["Leaves__r"]) == undefined){
                    delete parseData[i];
                  }
                  else{
                    delete parseData[i]["Leaves__r"];
                  }
                    
                } 
            this.dataToDisplay = parseData
            var dataObj;
            dataObj = parseData;
            this.projectListObj = dataObj;
            this.projectList = JSON.parse(JSON.stringify(dataObj).split('items').join('_children'));
            } 
            if(result.error){
              console.log('Error :'+ JSON.stringify(result.error));
            }
        }
        commentsChange(event) {
          this.comments= event.target.value;
  
      }
    handleApprove(){
          var selectedRows =this.template.querySelector('lightning-tree-grid').getSelectedRows();
          //console.log('selected rows :'+selectedRows);
          if(selectedRows.length > 0)
          { 
            this.status = 'Approved';
            this.showModalBox();
          }
          else{
            this.dispatchEvent(
              new ShowToastEvent({
                  title: 'Error',
                  message: 'Leave record is not Selected',
                  variant: 'error',
              }),
          );
          }
          
        }
    handleReject(){
      var selectedRows =this.template.querySelector('lightning-tree-grid').getSelectedRows();
          //console.log('selected rows :'+selectedRows);
          if(selectedRows.length > 0)
          { 
            this.status = 'Rejected';
            this.showModalBox();
          }
          else{
            this.dispatchEvent(
              new ShowToastEvent({
                  title: '',
                  message: 'Leave record is not Selected',
                  variant: 'error',
              }),
          );
          }
      }
      handleSubmit(){
        console.log('inside submit');
        console.log('this.comments ',this.comments);
        if(this.comments.trim() != '' && this.comments != undefined && this.comments != '')
        {
          console.log('inside submit');
          var selectedRows =this.template.querySelector('lightning-tree-grid').getSelectedRows();
          this.idList=[];
          console.log('selectedRows :'+JSON.stringify(selectedRows));
          selectedRows.forEach((row)=>{
            console.log('row.Id :'+row.Id);
            this.idList.push(row.Id);
          });
          console.log('idList :'+this.idList);
          this.hideModalBox();
          this.updateLeavesCall();
          /*for(i=0;i<selectRows.length;i++){
            console.log('selectRows[i].Id' ,selectRows[i].Id);
             idList[i] = selectRows[i].Id;
          }*/
          //console.log('selected rows :',selectedRows);
        }else{
          this.dispatchEvent(
            new ShowToastEvent({
                title: '',
                message: 'Please Enter Comments',
                variant: 'error',
            }),
        );
        }
        }
      showModalBox() {  
          this.isShowModal = true;
      }
      hideModalBox() {  
          this.isShowModal = false;
      }
      updateLeavesCall(){
        updateLeaves({ leaveIdList : this.idList ,status : this.status , managerComments : this.comments})
            .then(result => {
                this.message = result;
                this.error = undefined;
                if(this.message !== undefined) {
                    //this.showLoadingSpinner = false;
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Success',
                            message: 'Leaves updated',
                            variant: 'success',
                        }),
                    );
                }
                this.idList = [];
                this.comments = '';
                
                console.log(JSON.stringify(result));
                console.log("result", this.message);
                return refreshApex(this.refreshTable);
      })
      .catch(error => {
        this.showLoadingSpinner = false;
        this.message = undefined;
        this.error = error;
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Error updating Leave record',
                message: error.body.message,
                variant: 'error',
            }),
        );
        console.log("error", JSON.stringify(this.error));
    });
    }
      
    updateSelectedRows() {
      var tempList = [];
      var selectRows = this.template.querySelector('lightning-tree-grid').getSelectedRows();
      if(selectRows.length > 0){
          selectRows.forEach(record => {
              tempList.push(record.Id);
          })
          console.log('tempList :'+tempList);
          // select and deselect child rows based on header row
          console.log('*** projectListObj  '+this.projectListObj);
          this.projectListObj.forEach(record => {
              // if header was checked and remains checked, do not add sub-rows

              // if header was not checked but is now checked, add sub-rows
              
              console.log('*** record  '+JSON.stringify(record));
              console.log('this.currentSelectedRows :'+this.currentSelectedRows);
              if(!this.currentSelectedRows.includes(record.Id) && tempList.includes(record.Id)) {
                console.log('inside if')
                console.log('record ',JSON.stringify(record))
                  record._children.forEach(item => {
                      console.log('item :'+JSON.stringify(item))
                      if(!tempList.includes(item.Id)) {
                          tempList.push(item.Id);
                      }
                      console.log('tempList :'+tempList);
                  })
              }

              // if header was checked and is no longer checked, remove header and sub-rows
              if(this.currentSelectedRows.includes(record.Id) && !tempList.includes(record.Id)) {
                console.log('inside second if')
                  record._children.forEach(item => {
                      const index = tempList.indexOf(item.Id);
                      if(index > -1) {
                          tempList.splice(index, 1);
                      }
                  })
              }

              // if all child rows for the header row are checked, add the header
              // else remove the header
              var allSelected = true;
              record._children.forEach(item => {
                  if(!tempList.includes(item.Id)) {
                      allSelected = false;
                  }
              })

              if(allSelected && !tempList.includes(record.Id)) {
                  tempList.push(record.Id);
              } else if(!allSelected && tempList.includes(record.Id)) {
                  const index = tempList.indexOf(record.Id);
                  if(index > -1) {
                      tempList.splice(index, 1);
                  }
              }

          })

          this.selectedRows = tempList;
          this.currentSelectedRows = tempList;
      }
  } 
  
}