import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { addMember } from '../../../../store/thunks/teamsThunks';

const AddTeamMemberModal = ({ isOpen, onClose, team, onMemberAdded }) => {
  const [customerEmail, setCustomerEmail] = useState('');
  const [role, setRole] = useState('user');
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();

  // Reset form when modal opens or team changes
  useEffect(() => {
    if (isOpen) {
      setCustomerEmail('');
      setRole('user');
      setError(null);
    }
  }, [isOpen, team]);

  const handleAdd = async () => {
    if (!customerEmail.trim()) {
      setError('Customer email is required');
      return;
    }

    if (!team || !team.teamId) {
      setError('Team information is missing');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      const result = await dispatch(addMember({ 
        teamId: team.teamId || team.id,
        customerEmail: customerEmail.trim(),
        role: role
      }));

      if (addMember.fulfilled.match(result)) {
        setCustomerEmail('');
        setRole('user');
        onMemberAdded?.(result.payload);
        onClose();
      } else {
        // Handle specific error messages from backend
        const errorMessage = result.error || result.payload || 'Failed to add team member';
        setError(errorMessage);
      }
    } catch (err) {
      setError(err.message || 'Failed to add team member');
    } finally {
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setCustomerEmail('');
    setRole('user');
    setError(null);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isAdding) {
      handleAdd();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      onClick={handleCancel}
    >
      <div 
        className="bg-[#1C1C1E] border border-[#3A3A3C] rounded-xl shadow-lg max-w-lg w-[90%] max-h-[90vh] overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#3A3A3C] flex justify-between items-center">
          <h3 className="text-xl font-semibold text-white m-0">Add Team Member</h3>
          <button 
            className="bg-transparent border-none text-2xl text-[#8E8E93] cursor-pointer p-0 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-[#2C2C2E] hover:text-white"
            onClick={handleCancel}
          >
            ×
          </button>
        </div>
        
        <div className="p-6">
          <div className="mb-5">
            <label htmlFor="customerEmail" className="block text-sm font-medium text-[#E5E5E7] mb-2">
              Customer Email
            </label>
            <input
              id="customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e) => {
                setCustomerEmail(e.target.value);
                setError(null);
              }}
              onKeyDown={handleKeyPress}
              placeholder="Enter customer email address"
              className="w-full px-4 py-2.5 bg-[#000000] border border-[#3A3A3C] rounded-lg text-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent transition-all"
              autoFocus
              disabled={isAdding}
            />
            {error && (
              <p className="mt-2 text-sm text-[#FF3B30]">{error}</p>
            )}
          </div>

          <div className="mb-5">
            <label htmlFor="role" className="block text-sm font-medium text-[#E5E5E7] mb-2">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setError(null);
              }}
              className="w-full px-4 py-2.5 bg-[#000000] border border-[#3A3A3C] rounded-lg text-[#E5E5E7] text-sm focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent transition-all"
              disabled={isAdding}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <p className="mt-2 text-xs text-[#8E8E93]">
              Admins can manage team settings and members. Users can view and work with team data.
            </p>
          </div>
          
          <div className="flex justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={isAdding}
              className="px-4 py-2 bg-[#2C2C2E] text-[#E5E5E7] rounded-lg text-sm font-medium hover:bg-[#3A3A3C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={isAdding || !customerEmail.trim()}
              className="px-4 py-2 bg-[#007AFF] text-white rounded-lg text-sm font-medium hover:bg-[#0056CC] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isAdding ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Adding...
                </>
              ) : (
                'Add Member'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTeamMemberModal;

